# Daily Task App

A simple command-line daily task manager written in C++.

## Build

```
g++ -std=c++17 -O2 -static -o task_app src/main.cpp
```

## Run

```
./task_app
```

## Commands

- `add <description>` — Add a new task
- `list` — List all tasks
- `done <id>` — Mark a task as completed
- `rm <id>` — Delete a task
- `help` — Show the help message
- `exit` — Quit the app

Tasks are persisted to `tasks.txt` in the working directory.
