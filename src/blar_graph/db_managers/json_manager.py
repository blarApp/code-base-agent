import json
from typing import Any, List

from dotenv import load_dotenv

from blar_graph.db_managers.base_manager import BaseDBManager

load_dotenv()


class JSONManager(BaseDBManager):
    def __init__(self, default_path: str = "graph.json"):
        self.default_path = default_path

    def save_graph(self, nodes: List[Any], edges: List[Any], path: str = None):
        if path is None:
            path = self.default_path
        with open(path, "w") as f:
            json.dump({"nodes": nodes, "edges": edges}, f)
