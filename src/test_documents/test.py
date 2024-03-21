import test2


class Test:
    def hello():
        def hello2():
            print("Hello, world! 2")

        a = 1
        print("Hello, world!")

    def factorial(n):
        hello()
        result = 1
        for i in range(1, n + 1):
            result *= i
        return result

    def fibonacci(n):
        a, b = 0, 1
        while a < n:
            print(a, end=" ")
            a, b = b, a + b
