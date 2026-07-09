// Console Pong with selectable AI difficulty (Easy / Medium / Hard)
// Controls: W/S or Up/Down arrows to move your paddle, Esc to quit.
#include <windows.h>
#include <conio.h>
#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>
#include <ctime>

const int WIDTH = 78;
const int HEIGHT = 24;
const int PADDLE_HEIGHT = 5;
const int WIN_SCORE = 7;

enum Difficulty { EASY = 1, MEDIUM = 2, HARD = 3 };

struct AIConfig {
    int speed;          // max cells the AI paddle can move per frame
    int reactionDelay;  // frames of "thinking" before it starts tracking
    int errorMargin;    // vertical wobble added to its target (imperfection)
    bool predicts;       // whether it predicts the ball's bounce trajectory
};

AIConfig getAIConfig(Difficulty d) {
    switch (d) {
        case EASY:   return { 1, 6, 4, false };
        case MEDIUM: return { 2, 2, 2, false };
        case HARD:   return { 3, 0, 0, true };
    }
    return { 1, 6, 4, false };
}

// ConPTY (Windows Terminal) clips the literal last row/column when a
// WriteConsoleOutput region exactly matches the full buffer/window size,
// so the real console buffer/window is kept one row taller than the game
// grid and that extra row is simply never drawn into.
const int CONSOLE_HEIGHT = HEIGHT + 1;

HANDLE hConsole;
CHAR_INFO buffer[WIDTH * HEIGHT];
SMALL_RECT writeRegion = { 0, 0, WIDTH - 1, HEIGHT - 1 };
COORD bufferSize = { WIDTH, CONSOLE_HEIGHT };
COORD bufferCoord = { 0, 0 };

void setCell(int x, int y, char ch, WORD color = 7) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
    buffer[y * WIDTH + x].Char.AsciiChar = ch;
    buffer[y * WIDTH + x].Attributes = color;
}

void clearBuffer() {
    for (int i = 0; i < WIDTH * HEIGHT; i++) {
        buffer[i].Char.AsciiChar = ' ';
        buffer[i].Attributes = 7;
    }
}

void drawBorderAndText(int leftScore, int rightScore, const std::string& footer) {
    for (int x = 0; x < WIDTH; x++) {
        setCell(x, 0, '-');
        setCell(x, HEIGHT - 1, '-');
    }
    for (int y = 0; y < HEIGHT; y++) {
        setCell(0, y, '|');
        setCell(WIDTH - 1, y, '|');
    }
    for (int y = 1; y < HEIGHT - 1; y += 2) {
        setCell(WIDTH / 2, y, ':');
    }
    std::string score = "YOU " + std::to_string(leftScore) + "   -   " + std::to_string(rightScore) + " CPU";
    int startX = (WIDTH - (int)score.size()) / 2;
    for (size_t i = 0; i < score.size(); i++) {
        setCell(startX + (int)i, 0, score[i], 11);
    }
    int fx = (WIDTH - (int)footer.size()) / 2;
    for (size_t i = 0; i < footer.size(); i++) {
        setCell(fx + (int)i, HEIGHT - 1, footer[i], 14);
    }
}

void present() {
    WriteConsoleOutput(hConsole, buffer, bufferSize, bufferCoord, &writeRegion);
}

void hideCursor() {
    CONSOLE_CURSOR_INFO info;
    info.dwSize = 100;
    info.bVisible = FALSE;
    SetConsoleCursorInfo(hConsole, &info);
}

Difficulty chooseDifficulty() {
    system("cls");
    std::cout << "===================================\n";
    std::cout << "            C++  PONG\n";
    std::cout << "===================================\n\n";
    std::cout << "  Select AI difficulty:\n\n";
    std::cout << "    1) Easy\n";
    std::cout << "    2) Medium\n";
    std::cout << "    3) Hard\n\n";
    std::cout << "  Choice: ";
    int choice = 0;
    while (choice < 1 || choice > 3) {
        char c = _getch();
        if (c >= '1' && c <= '3') choice = c - '0';
    }
    return static_cast<Difficulty>(choice);
}

int main() {
    srand((unsigned)time(nullptr));

    hConsole = GetStdHandle(STD_OUTPUT_HANDLE);
    SMALL_RECT windowSize = { 0, 0, WIDTH - 1, CONSOLE_HEIGHT - 1 };
    SetConsoleWindowInfo(hConsole, TRUE, &windowSize);
    SetConsoleScreenBufferSize(hConsole, bufferSize);
    SetConsoleWindowInfo(hConsole, TRUE, &windowSize);
    hideCursor();

    bool playAgain = true;
    while (playAgain) {
        Difficulty diff = chooseDifficulty();
        AIConfig ai = getAIConfig(diff);

        double leftY = HEIGHT / 2.0 - PADDLE_HEIGHT / 2.0;
        double rightY = HEIGHT / 2.0 - PADDLE_HEIGHT / 2.0;
        double ballX = WIDTH / 2.0;
        double ballY = HEIGHT / 2.0;
        double ballVX = (rand() % 2 == 0 ? 1 : -1) * 0.9;
        double ballVY = ((rand() % 3) - 1) * 0.6;
        if (ballVY == 0) ballVY = 0.4;

        int leftScore = 0, rightScore = 0;
        int aiThinkCounter = 0;
        double aiTarget = rightY;
        bool running = true;
        std::string statusMsg = "W/S or Up/Down to move | Esc to quit";

        while (running) {
            // --- input ---
            if (GetAsyncKeyState(VK_ESCAPE) & 0x8000) { running = false; playAgain = false; break; }
            if ((GetAsyncKeyState('W') & 0x8000) || (GetAsyncKeyState(VK_UP) & 0x8000)) leftY -= 1.0;
            if ((GetAsyncKeyState('S') & 0x8000) || (GetAsyncKeyState(VK_DOWN) & 0x8000)) leftY += 1.0;
            if (leftY < 1) leftY = 1;
            if (leftY > HEIGHT - 1 - PADDLE_HEIGHT) leftY = HEIGHT - 1 - PADDLE_HEIGHT;

            // --- ball update ---
            ballX += ballVX;
            ballY += ballVY;

            if (ballY <= 1) { ballY = 1; ballVY = -ballVY; }
            if (ballY >= HEIGHT - 2) { ballY = HEIGHT - 2; ballVY = -ballVY; }

            // left paddle collision
            if (ballX <= 2 && ballX > 1 && ballY >= leftY - 0.5 && ballY <= leftY + PADDLE_HEIGHT + 0.5) {
                ballX = 2;
                ballVX = -ballVX * 1.03; // slight speed-up
                double hit = (ballY - (leftY + PADDLE_HEIGHT / 2.0)) / (PADDLE_HEIGHT / 2.0);
                ballVY = hit * 0.9;
            }
            // right paddle collision
            if (ballX >= WIDTH - 3 && ballX < WIDTH - 2 && ballY >= rightY - 0.5 && ballY <= rightY + PADDLE_HEIGHT + 0.5) {
                ballX = WIDTH - 3;
                ballVX = -ballVX * 1.03;
                double hit = (ballY - (rightY + PADDLE_HEIGHT / 2.0)) / (PADDLE_HEIGHT / 2.0);
                ballVY = hit * 0.9;
            }

            // scoring
            if (ballX < 1) {
                rightScore++;
                ballX = WIDTH / 2.0; ballY = HEIGHT / 2.0;
                ballVX = 0.9; ballVY = ((rand() % 3) - 1) * 0.6;
                if (ballVY == 0) ballVY = 0.4;
            } else if (ballX > WIDTH - 2) {
                leftScore++;
                ballX = WIDTH / 2.0; ballY = HEIGHT / 2.0;
                ballVX = -0.9; ballVY = ((rand() % 3) - 1) * 0.6;
                if (ballVY == 0) ballVY = 0.4;
            }

            if (leftScore >= WIN_SCORE || rightScore >= WIN_SCORE) {
                statusMsg = leftScore > rightScore ? "YOU WIN! Press any key..." : "CPU WINS! Press any key...";
                running = false;
            }

            // --- AI update ---
            {
                double simX = ballX, simY = ballY, simVX = ballVX, simVY = ballVY;
                if (ai.predicts && ballVX > 0) {
                    // predict where ball will cross the AI paddle's x position, bouncing off walls
                    while (simX < WIDTH - 3) {
                        simX += simVX;
                        simY += simVY;
                        if (simY <= 1 || simY >= HEIGHT - 2) simVY = -simVY;
                    }
                    aiTarget = simY - PADDLE_HEIGHT / 2.0;
                } else if (ballVX > 0) {
                    aiTarget = ballY - PADDLE_HEIGHT / 2.0;
                }
                // otherwise (ball moving away) drift back toward center slowly
                if (ballVX <= 0) {
                    aiTarget = HEIGHT / 2.0 - PADDLE_HEIGHT / 2.0;
                }

                if (aiThinkCounter < ai.reactionDelay) {
                    aiThinkCounter++;
                } else {
                    double wobble = ai.errorMargin > 0 ? ((rand() % (ai.errorMargin * 2 + 1)) - ai.errorMargin) * 0.3 : 0.0;
                    double target = aiTarget + wobble;
                    if (rightY + PADDLE_HEIGHT / 2.0 < target - 0.3) rightY += ai.speed;
                    else if (rightY + PADDLE_HEIGHT / 2.0 > target + 0.3) rightY -= ai.speed;
                    aiThinkCounter = 0;
                }
                if (rightY < 1) rightY = 1;
                if (rightY > HEIGHT - 1 - PADDLE_HEIGHT) rightY = HEIGHT - 1 - PADDLE_HEIGHT;
            }

            // --- render ---
            clearBuffer();
            drawBorderAndText(leftScore, rightScore, running ? statusMsg : statusMsg);
            for (int i = 0; i < PADDLE_HEIGHT; i++) {
                setCell(2, (int)leftY + i, (char)219, 10);
                setCell(WIDTH - 3, (int)rightY + i, (char)219, 12);
            }
            setCell((int)ballX, (int)ballY, (char)254, 15);
            present();

            Sleep(30);
        }

        if (playAgain) {
            present();
            Sleep(200);
            while (_kbhit()) _getch();
            _getch();
            std::cout << "\nPlay again? (y/n): ";
            std::string flush;
            char c;
            do { c = _getch(); } while (c != 'y' && c != 'Y' && c != 'n' && c != 'N');
            playAgain = (c == 'y' || c == 'Y');
        }
    }

    system("cls");
    std::cout << "Thanks for playing!\n";
    return 0;
}
