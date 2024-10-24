from .LspCaller import LspCaller
from Files import File
from .SymbolKind import SymbolKind
from Graph.Node import NodeFactory, FileNode, Node
from Graph.Relationship import RelationshipCreator, RelationshipType
from .ContextTracker import ContextTracker
from typing import List


class SymbolGetter:
    @staticmethod
    def get_symbol_start_position(symbol: dict):
        return symbol["location"]["range"]["start"]

    @staticmethod
    def get_symbol_end_position(symbol: dict):
        return symbol["location"]["range"]["end"]

    @staticmethod
    def get_symbol_uri(symbol: dict):
        return symbol["location"]["uri"]

    @staticmethod
    def get_symbol_kind_as_SymbolKind(symbol: dict):
        return SymbolKind(symbol["kind"])

    @staticmethod
    def get_symbol_name(symbol: dict):
        return symbol["name"]

    @staticmethod
    def get_symbol_start_line(symbol: dict):
        return symbol["location"]["range"]["start"]["line"]

    @staticmethod
    def get_symbol_end_line(symbol: dict):
        return symbol["location"]["range"]["end"]["line"]


class DefinitionGetter:
    @staticmethod
    def get_definition_uri(definition: dict):
        return definition["uri"]

    @staticmethod
    def get_definition_range(definition: dict):
        return definition["range"]


class LspQueryHelper:
    def __init__(self, lsp_caller: LspCaller):
        self.lsp_caller = lsp_caller

    def start(self):
        self.lsp_caller.connect()
        self.lsp_caller.initialize()

    # Document symbols are symbols that are declared in a file, this includes classes, functions, methods but also imports
    def create_document_symbols_nodes_for_file_node(self, file: FileNode):
        symbols = self.lsp_caller.get_document_symbols(file.path)
        if not symbols:
            return []
        return self._get_all_symbols_as_nodes(symbols)

    def _get_all_symbols_as_nodes(self, symbols):
        nodes = []

        for symbol in symbols:
            node = self._create_node_from_symbol(symbol)
            if node:
                nodes.append(node)

        return nodes

    def _create_node_from_symbol(self, symbol):
        start_position = SymbolGetter.get_symbol_start_position(symbol)
        uri = SymbolGetter.get_symbol_uri(symbol)
        kind = SymbolGetter.get_symbol_kind_as_SymbolKind(symbol)
        name = SymbolGetter.get_symbol_name(symbol)

        definition = self.lsp_caller.get_declaration(uri, start_position)
        if not definition:
            return None

        definition_uri = DefinitionGetter.get_definition_uri(definition)
        definition_range = DefinitionGetter.get_definition_range(definition)

        return NodeFactory.create_node_based_on_kind(
            kind,
            name,
            definition_uri,
            definition_range,
        )

    def get_paths_where_node_is_referenced(self, node: Node):
        references = self.lsp_caller.get_references(
            node.path, node.definition_range["start"]
        )
        print(node.path, node.definition_range, node.label)
        if not references:
            return []
        return self._get_references_paths(references)

    def _get_references_paths(self, references: List[dict]):
        return [reference["uri"] for reference in references]
