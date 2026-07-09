# Pong

A console-based Pong game in C++ for Windows, with selectable AI difficulty.

## Build

```
g++ -o pong pong.cpp
```

## Run

```
./pong
```

Pick a difficulty (Easy, Medium, or Hard) from the menu, then play with W/S or the Up/Down arrow keys. First to 7 points wins. Press Esc to quit.

## AI difficulty

- **Easy** — slow paddle, slow to react, tracks the ball loosely
- **Medium** — moderate speed and reaction time
- **Hard** — fast paddle with no reaction delay that predicts the ball's bounce trajectory
