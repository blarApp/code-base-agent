from typing import List
from blar_graph.graph_construction.core.graph_builder import GraphConstructor
from blar_graph.db_managers import Neo4jManager


class GraphUpdater(GraphConstructor):
    def __init__(self, graph_manager: Neo4jManager, whitelisted_files: List[str] = None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.graph_manager = graph_manager

        if whitelisted_files is None:
            whitelisted_files = []
        self.whitelisted_files = whitelisted_files

    def _skip_file(self, path):
        print(path)
        return path not in self.whitelisted_files or super()._skip_file(path)
