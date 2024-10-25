from typing import NamedTuple


class DefinitionRange(NamedTuple):
    start_line: int
    start_character: int
    end_line: int
    end_character: int

    @property
    def start_dict(self):
        return {"line": self.start_line, "character": self.start_character}

    @property
    def end_dict(self):
        return {"line": self.end_line, "character": self.end_character}
