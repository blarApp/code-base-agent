from urllib.parse import unquote

from dataclasses import dataclass


@dataclass
class Point:
    line: int
    character: int


@dataclass
class Range:
    start: Point
    end: Point


@dataclass
class Reference:
    range: Range
    uri: str

    def __init__(self, reference: dict = None, range: Range = None, uri: str = None):
        if range and uri:
            self.range = range
            self.uri = self._desencode_uri(uri)

        elif reference:
            self._initialize_from_dict(reference)

        else:
            raise ValueError("Invalid Reference initialization")

    def _initialize_from_dict(self, reference: dict) -> Range:
        self.range = Range(
            Point(reference["range"]["start"]["line"], reference["range"]["start"]["character"]),
            Point(reference["range"]["end"]["line"], reference["range"]["end"]["character"]),
        )

        uri = reference["uri"]
        self.uri = self._desencode_uri(uri)

    def _desencode_uri(self, uri: str) -> str:
        return unquote(uri)

    @property
    def start_dict(self) -> dict:
        return {"line": self.range.start.line, "character": self.range.start.character}

    @property
    def end_dict(self) -> dict:
        return {"line": self.range.end.line, "character": self.range.end.character}
