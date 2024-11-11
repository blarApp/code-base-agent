from .lsp_caller import LspCaller
from .types.Reference import Reference
from graph.node import DefinitionNode


class LspQueryHelper:
    lsp_caller: LspCaller

    def __init__(self, lsp_caller: LspCaller):
        self.lsp_caller = lsp_caller

    def start(self) -> None:
        self.lsp_caller.connect()
        self.lsp_caller.initialize()

    def initialize_directory(self, file) -> None:
        self.lsp_caller.did_open(file.uri_path, self._read_file(file.path))

    def _read_file(self, file_path: str) -> str:
        try:
            with open(file_path, "r") as file:
                return file.read()
        except UnicodeDecodeError:
            return ""

    def get_paths_where_node_is_referenced(self, node: DefinitionNode) -> list[Reference]:
        references = self.lsp_caller.get_references(node.path, node.definition_range.start_dict)
        if not references:
            print(f"No references found for {node.name}")
            return []
        return [Reference(reference) for reference in references]

    def shutdown_exit_close(self) -> None:
        self.lsp_caller.shutdown_exit_close()
