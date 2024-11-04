from .LspCaller import LspCaller
from Graph.Node import Node


class LspQueryHelper:
    lsp_caller: LspCaller

    def __init__(self, lsp_caller: LspCaller):
        self.lsp_caller = lsp_caller

    def start(self) -> None:
        self.lsp_caller.connect()
        self.lsp_caller.initialize()

    def get_paths_where_node_is_referenced(self, node: Node) -> list:
        references = self.lsp_caller.get_references(node.path, node.definition_range.start_dict)
        if not references:
            print(f"No references found for {node.name}")
            return []
        return references

    def shutdown_exit_close(self) -> None:
        self.lsp_caller.shutdown_exit_close()
