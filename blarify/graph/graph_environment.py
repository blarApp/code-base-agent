from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class GraphEnvironment:
    environment: str
    diff_identifier: str
    root_path: str

    def __str__(self):
        return f"/{self.environment}/{self.diff_identifier}"


if __name__ == "__main__":
    logger.info(GraphEnvironment("dev", None))
