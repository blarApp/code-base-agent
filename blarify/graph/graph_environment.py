from dataclasses import dataclass
from blarify.format_verifier import FormatVerifier


@dataclass
class GraphEnvironment:
    environment: str
    diff_identifier: str
    root_path: str

    def __str__(self):
        return f"/{self.environment}/{self.diff_identifier}"


if __name__ == "__main__":
    print(GraphEnvironment("dev", None))
