class Test:
    def hello(self):
        def hello2():
            self.fibonacci(2)
            print("Hello, world! 2")
            raise Exception("Error!")

        hello2()
        self.hello2()
        a = 1
        print("Hello, world!")

    def factorial(self, n):
        result = 1
        for i in range(1, n + 1):
            result *= i
        return result

    def fibonacci(self, n):
        a, b = 0, 1
        while a < n:
            print(a, end=" ")
            a, b = b, a + b

    def hello2(self):
        print("hc")


def run():
    test = Test()
    test.hello()
