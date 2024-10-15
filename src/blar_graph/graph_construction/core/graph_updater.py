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
        return path not in self.whitelisted_files or super()._skip_file(path)

    def _get_import_from_global_graph_info(self, path):
        node_id = super()._get_import_from_global_graph_info(path)
        if node_id:
            return node_id

        try:
            node = self.graph_manager.get_node_by_path(path)
            print("node", node)
            return {"id": node["node_id"], "type": self._get_label_that_is_not_node(node["labels"])}
        except Exception as e:
            print(f"Could not get node from path: {path}", e)
            return None

    def _get_label_that_is_not_node(self, labels):
        for label in labels:
            if label != "NODE":
                return label

    def _get_import_alias_from_global_graph_info(self, path):
        return super()._get_import_alias_from_global_graph_info(path)
