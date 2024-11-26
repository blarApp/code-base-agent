from dataclasses import dataclass


@dataclass
class GraphEnviroment:
    enviroment: str
    pr_id: str

    def __str__(self):
        return f"/{self.enviroment}/{self.pr_id}"


if __name__ == "__main__":
    print(GraphEnviroment("dev", None))
