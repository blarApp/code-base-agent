import time
from blarify.code_references import LspQueryHelper, FileExtensionNotSupported
from blarify.project_file_explorer import ProjectFilesIterator
from blarify.graph.node import NodeLabels, NodeFactory
from blarify.graph.relationship import RelationshipCreator
from blarify.graph.graph import Graph
from blarify.code_hierarchy import TreeSitterHelper
from blarify.code_hierarchy.languages import (
    PythonDefinitions,
    JavascriptDefinitions,
    TypescriptDefinitions,
    FallbackDefinitions,
    RubyDefinitions,
    CsharpDefinitions,
)
from typing import List, TYPE_CHECKING
from blarify.logger import Logger
from blarify.graph.graph_environment import GraphEnvironment


if TYPE_CHECKING:
    from blarify.graph.node import FolderNode
    from blarify.project_file_explorer import File, Folder
    from blarify.graph.node import Node, FileNode
    from blarify.graph.relationship import Relationship


class ProjectGraphCreator:
    root_path: str
    lsp_query_helper: LspQueryHelper
    project_files_iterator: ProjectFilesIterator
    graph: Graph
    languages: dict = {
        ".py": PythonDefinitions,
        ".js": JavascriptDefinitions,
        ".jsx": JavascriptDefinitions,
        ".ts": TypescriptDefinitions,
        ".tsx": TypescriptDefinitions,
        ".rb": RubyDefinitions,
        ".cs": CsharpDefinitions,
    }

    def __init__(
        self,
        root_path: str,
        lsp_query_helper: LspQueryHelper,
        project_files_iterator: ProjectFilesIterator,
        graph_environment: "GraphEnvironment" = None,
    ):
        self.root_path = root_path
        self.lsp_query_helper = lsp_query_helper
        self.project_files_iterator = project_files_iterator
        self.graph_environment = graph_environment or GraphEnvironment("blarify", "repo", self.root_path)

        self.graph = Graph()

    def build(self) -> Graph:
        self.create_code_hierarchy()

        # TODO: Implement a better way to wait for the lsp to finish
        Logger.log("Waiting for LSP to finish")
        # time.sleep(15)
        Logger.log("LSP finished")

        self.create_relationships_from_references_for_files()
        return self.graph

    def build_hierarchy_only(self) -> Graph:
        self.create_code_hierarchy()
        return self.graph

    def create_code_hierarchy(self):
        start_time = time.time()

        for folder in self.project_files_iterator:
            self.process_folder(folder)

        end_time = time.time()
        execution_time = end_time - start_time
        Logger.log(f"Execution time of create_code_hierarchy: {execution_time:.2f} seconds")

    def process_folder(self, folder: "Folder") -> None:
        folder_node = self.add_or_get_folder_node(folder)
        folder_nodes = self.create_subfolder_nodes(folder, folder_node)
        folder_node.relate_nodes_as_contain_relationship(folder_nodes)

        self.graph.add_nodes(folder_nodes)

        files = folder.files
        self.process_files(files, parent_folder=folder_node)

    def add_or_get_folder_node(self, folder: "Folder", parent_folder: "Folder" = None) -> "FolderNode":
        if self.graph.has_folder_node_with_path(folder.uri_path):
            return self.graph.get_folder_node_by_path(folder.uri_path)
        else:
            folder_node = NodeFactory.create_folder_node(
                folder, parent=parent_folder, graph_environment=self.graph_environment
            )
            self.graph.add_node(folder_node)
            return folder_node

    def create_subfolder_nodes(self, folder: "Folder", folder_node: "FolderNode") -> List["Node"]:
        nodes = []
        for sub_folder in folder.folders:
            node = self.add_or_get_folder_node(sub_folder, parent_folder=folder_node)
            nodes.append(node)

        return nodes

    def process_files(self, files: List["File"], parent_folder: "FolderNode") -> None:
        for file in files:
            self.process_file(file, parent_folder)

    def process_file(self, file: "File", parent_folder: "FolderNode") -> None:
        tree_sitter_helper = self._get_tree_sitter_for_file_extension(file.extension)
        self.try_initialize_directory(file)
        file_nodes = self.create_file_nodes(
            file=file, parent_folder=parent_folder, tree_sitter_helper=tree_sitter_helper
        )
        self.graph.add_nodes(file_nodes)

        file_node = self.get_file_node_from_file_nodes(file_nodes)
        file_node.skeletonize()

        parent_folder.relate_node_as_contain_relationship(file_node)

    def try_initialize_directory(self, file: "File") -> None:
        try:
            self.lsp_query_helper.initialize_directory(file)
        except FileExtensionNotSupported:
            pass

    def _get_tree_sitter_for_file_extension(self, file_extension: str) -> TreeSitterHelper:
        language = self._get_language_definition(file_extension=file_extension)
        return TreeSitterHelper(language_definitions=language, graph_environment=self.graph_environment)

    def _get_language_definition(self, file_extension: str):
        return self.languages.get(file_extension, FallbackDefinitions)

    def get_file_node_from_file_nodes(self, file_nodes) -> "FileNode":
        # File node should always be the first node in the list
        for node in file_nodes:
            if node.label == NodeLabels.FILE:
                return node

        raise ValueError("File node not found in file nodes")

    def create_file_nodes(
        self, file: "File", parent_folder: "FolderNode", tree_sitter_helper: TreeSitterHelper
    ) -> List["Node"]:
        document_symbols = tree_sitter_helper.create_nodes_and_relationships_in_file(file, parent_folder=parent_folder)
        return document_symbols

    def create_relationships_from_references_for_files(self) -> None:
        file_nodes = self.graph.get_nodes_by_label(NodeLabels.FILE)
        self.create_relationship_from_references(file_nodes)

    def create_relationship_from_references(self, file_nodes: List["Node"]) -> None:
        references_relationships = []

        total_files = len(file_nodes)
        log_interval = max(1, total_files // 10)

        for index, file_node in enumerate(file_nodes):
            start_time = time.time()
            self._log_if_multiple_of_x(
                index=index,
                x=log_interval,
                text=f"Processing file {file_node.name}: {index + 1}/{total_files} -- {100 * index / total_files:.2f}%",
            )

            nodes = self.graph.get_nodes_by_path(file_node.path)
            for node in nodes:
                if node.label == NodeLabels.FILE:
                    continue

                tree_sitter_helper = self._get_tree_sitter_for_file_extension(node.extension)
                references_relationships.extend(
                    self.create_node_relationships(node=node, tree_sitter_helper=tree_sitter_helper)
                )
            end_time = time.time()

            execution_time = end_time - start_time
            self._log_if_multiple_of_x(
                index=index,
                x=log_interval,
                text=f"Execution time for {file_node.name}: {execution_time:.2f} seconds, relationship count: {len(references_relationships)}",
            )

        self.graph.add_references_relationships(references_relationships=references_relationships)

    def _log_if_multiple_of_x(self, index: int, x: int, text: str) -> None:
        if index % x == 0:
            Logger.log(text)

    def create_node_relationships(
        self,
        node: "Node",
        tree_sitter_helper: TreeSitterHelper,
    ) -> List["Relationship"]:
        references = self.lsp_query_helper.get_paths_where_node_is_referenced(node)

        relationships = RelationshipCreator.create_relationships_from_paths_where_node_is_referenced(
            references=references, node=node, graph=self.graph, tree_sitter_helper=tree_sitter_helper
        )

        return relationships
