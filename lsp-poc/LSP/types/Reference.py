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

    def __init__(self, reference: dict):
        self.range = Range(
            Point(reference["range"]["start"]["line"], reference["range"]["start"]["character"]),
            Point(reference["range"]["end"]["line"], reference["range"]["end"]["character"]),
        )
        self.uri = reference["uri"]
