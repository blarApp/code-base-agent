from .LspCaller import LspCaller
from Graph.Node import Node
from typing import List


class LspQueryHelper:
    def __init__(self, lsp_caller: LspCaller):
        self.lsp_caller = lsp_caller

    def start(self):
        self.lsp_caller.connect()
        self.lsp_caller.initialize()

    def get_paths_where_node_is_referenced(self, node: Node):
        references = self.lsp_caller.get_references(
            node.path, node.definition_range.start_dict
        )
        if not references:
            return []
        return self._get_references_paths(references)

    def _get_references_paths(self, references: List[dict]):
        print(references)
        return [reference["uri"] for reference in references]

    def shutdown_exit_close(self):
        self.lsp_caller.shutdown_exit_close()
