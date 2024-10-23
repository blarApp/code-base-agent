from collections import namedtuple

Symbol = namedtuple("Symbol", ["name", "start_line", "end_line"])


class ContextTracker:
    def __init__(self):
        self.latest_symbols = []

    def add_symbol(self, symbol: str, start_line: int, end_line: int):
        self.latest_symbols.append(Symbol(symbol, start_line, end_line))

    def get_context(self, line: int):
        found_symbol = None
        for symbol in self.latest_symbols:
            if symbol.start_line <= line <= symbol.end_line:
                found_symbol = symbol.name

        return found_symbol
