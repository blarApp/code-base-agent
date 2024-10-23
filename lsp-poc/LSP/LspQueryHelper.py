from .LspCaller import LspCaller
from Files import File
from .SymbolKind import SymbolKind
from Graph.Node import NodeFactory, FileNode


class SymbolGetter:
    @staticmethod
    def get_symbol_start_position(symbol: dict):
        return symbol["location"]["range"]["start"]

    @staticmethod
    def get_symbol_uri(symbol: dict):
        return symbol["location"]["uri"]

    @staticmethod
    def get_symbol_kind_as_SymbolKind(symbol: dict):
        return SymbolKind(symbol["kind"])

    @staticmethod
    def get_symbol_name(symbol: dict):
        return symbol["name"]


class DefinitionGetter:
    @staticmethod
    def get_definition_uri(definition: dict):
        return definition[0]["uri"]


class LspQueryHelper:
    def __init__(self, lsp_caller: LspCaller):
        self.lsp_caller = lsp_caller

    def start(self):
        self.lsp_caller.connect()
        self.lsp_caller.initialize()

    # Document symbols are symbols that are declared in a file, this includes classes, functions, methods but also imports
    def create_document_symbols_nodes_for_file_node(self, file: FileNode):
        symbols = self.lsp_caller.get_document_symbols(file.uri_path).get("result")
        if not symbols:
            return []
        return self._get_all_symbols_as_nodes(symbols)

    def _get_all_symbols_as_nodes(self, symbols):
        nodes = []
        for symbol in symbols:
            start_position = SymbolGetter.get_symbol_start_position(symbol)
            uri = SymbolGetter.get_symbol_uri(symbol)
            kind = SymbolGetter.get_symbol_kind_as_SymbolKind(symbol)
            name = SymbolGetter.get_symbol_name(symbol)

            definition = self.lsp_caller.get_definition(uri, start_position).get(
                "result"
            )

            if not definition:
                print("No definition found for symbol", name)
                continue

            definition_uri = DefinitionGetter.get_definition_uri(definition)

            node = NodeFactory.create_node_based_on_kind(kind, name, definition_uri)
            if node:
                nodes.append(node)

        return nodes

    def get_symbols_declared_in_file(self, file: File):
        self.lsp_caller.get_document_symbols(file.uri_path)

    def get_reference_of_symbol(self, file: File, position):
        self.lsp_caller.get_references(file.uri_path, position)
