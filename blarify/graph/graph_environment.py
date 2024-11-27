from dataclasses import dataclass


@dataclass
class GraphEnvironment:
    environment: str
    diff_identifier: str

    def __str__(self):
        return f"/{self.environment}/{self.diff_identifier}"


if __name__ == "__main__":
    print(GraphEnvironment("dev", None))
