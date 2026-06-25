#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm>

struct Task {
    int id;
    std::string description;
    bool done;
};

static const std::string DATA_FILE = "tasks.txt";

std::string escape(const std::string& s) {
    std::string out;
    for (char c : s) {
        if (c == '|') out += "\\|";
        else out += c;
    }
    return out;
}

std::string unescape(const std::string& s) {
    std::string out;
    for (size_t i = 0; i < s.size(); ++i) {
        if (s[i] == '\\' && i + 1 < s.size() && s[i + 1] == '|') {
            out += '|';
            ++i;
        } else {
            out += s[i];
        }
    }
    return out;
}

std::vector<Task> loadTasks() {
    std::vector<Task> tasks;
    std::ifstream file(DATA_FILE);
    std::string line;
    while (std::getline(file, line)) {
        if (line.empty()) continue;
        size_t firstSep = line.find('|');
        size_t secondSep = line.find('|', firstSep + 1);
        if (firstSep == std::string::npos || secondSep == std::string::npos) continue;
        Task t;
        t.id = std::stoi(line.substr(0, firstSep));
        t.done = line.substr(firstSep + 1, secondSep - firstSep - 1) == "1";
        t.description = unescape(line.substr(secondSep + 1));
        tasks.push_back(t);
    }
    return tasks;
}

void saveTasks(const std::vector<Task>& tasks) {
    std::ofstream file(DATA_FILE, std::ios::trunc);
    for (const auto& t : tasks) {
        file << t.id << '|' << (t.done ? '1' : '0') << '|' << escape(t.description) << '\n';
    }
}

int nextId(const std::vector<Task>& tasks) {
    int maxId = 0;
    for (const auto& t : tasks) maxId = std::max(maxId, t.id);
    return maxId + 1;
}

void printTasks(const std::vector<Task>& tasks) {
    if (tasks.empty()) {
        std::cout << "No tasks yet. Add one!\n";
        return;
    }
    for (const auto& t : tasks) {
        std::cout << "[" << (t.done ? 'x' : ' ') << "] "
                   << t.id << ". " << t.description << '\n';
    }
}

void addTask(std::vector<Task>& tasks, const std::string& desc) {
    tasks.push_back({nextId(tasks), desc, false});
    saveTasks(tasks);
    std::cout << "Task added.\n";
}

bool completeTask(std::vector<Task>& tasks, int id) {
    for (auto& t : tasks) {
        if (t.id == id) {
            t.done = true;
            saveTasks(tasks);
            return true;
        }
    }
    return false;
}

bool deleteTask(std::vector<Task>& tasks, int id) {
    auto it = std::remove_if(tasks.begin(), tasks.end(),
                              [id](const Task& t) { return t.id == id; });
    if (it == tasks.end()) return false;
    tasks.erase(it, tasks.end());
    saveTasks(tasks);
    return true;
}

void printHelp() {
    std::cout <<
        "Commands:\n"
        "  add <description>   Add a new task\n"
        "  list                List all tasks\n"
        "  done <id>           Mark a task as completed\n"
        "  rm <id>             Delete a task\n"
        "  help                Show this help message\n"
        "  exit                Quit the app\n";
}

int main() {
    std::vector<Task> tasks = loadTasks();

    std::cout << "Daily Task App\n";
    printHelp();

    std::string line;
    while (true) {
        std::cout << "\n> ";
        if (!std::getline(std::cin, line)) break;

        std::istringstream iss(line);
        std::string cmd;
        iss >> cmd;

        if (cmd == "add") {
            std::string desc;
            std::getline(iss, desc);
            if (!desc.empty() && desc[0] == ' ') desc.erase(0, 1);
            if (desc.empty()) {
                std::cout << "Usage: add <description>\n";
            } else {
                addTask(tasks, desc);
            }
        } else if (cmd == "list") {
            printTasks(tasks);
        } else if (cmd == "done") {
            int id;
            if (iss >> id) {
                std::cout << (completeTask(tasks, id) ? "Task completed.\n" : "Task not found.\n");
            } else {
                std::cout << "Usage: done <id>\n";
            }
        } else if (cmd == "rm") {
            int id;
            if (iss >> id) {
                std::cout << (deleteTask(tasks, id) ? "Task deleted.\n" : "Task not found.\n");
            } else {
                std::cout << "Usage: rm <id>\n";
            }
        } else if (cmd == "help") {
            printHelp();
        } else if (cmd == "exit" || cmd == "quit") {
            break;
        } else if (!cmd.empty()) {
            std::cout << "Unknown command. Type 'help' for a list of commands.\n";
        }
    }

    std::cout << "Goodbye!\n";
    return 0;
}
