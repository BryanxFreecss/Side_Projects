#include <iostream>

int main() {
    double a, b;
    char op;

    std::cout << "Enter expression (e.g. 3 + 4): ";
    std::cin >> a >> op >> b;

    double result;
    switch (op) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/':
            if (b == 0) {
                std::cout << "Error: division by zero" << std::endl;
                return 1;
            }
            result = a / b;
            break;
        default:
            std::cout << "Error: unknown operator '" << op << "'" << std::endl;
            return 1;
    }

    std::cout << a << " " << op << " " << b << " = " << result << std::endl;
    return 0;
}
