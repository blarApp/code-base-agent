from code_references import LspQueryHelper
from project_file_explorer import ProjectFilesIterator
from graph.node import NodeLabels, NodeFactory
from graph.relationship import RelationshipCreator
from code_hierarchy import TreeSitterHelper
from typing import List, TYPE_CHECKING
from graph.graph import Graph

if TYPE_CHECKING:
    from graph.node import FolderNode
    from project_file_explorer import File, Folder
    from graph.node import Node, FileNode
    from graph.relationship import Relationship


class ProjectGraphCreator:
    root_path: str
    lsp_query_helper: LspQueryHelper
    tree_sitter_helper: TreeSitterHelper
    project_files_iterator: ProjectFilesIterator
    graph: Graph

    def __init__(
        self,
        root_path: str,
        lsp_query_helper: LspQueryHelper,
        tree_sitter_helper: TreeSitterHelper,
        project_files_iterator: ProjectFilesIterator,
    ):
        self.root_path = root_path
        self.lsp_query_helper = lsp_query_helper
        self.tree_sitter_helper = tree_sitter_helper
        self.project_files_iterator = project_files_iterator

        self.graph = Graph()

    def build(self) -> Graph:
        self.create_code_hierarchy()
        self.create_relationships_from_references()
        return self.graph

    def create_code_hierarchy(self):
        for folder in self.project_files_iterator:
            self.process_folder(folder)

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
            folder_node = NodeFactory.create_folder_node(folder, parent=parent_folder)
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
        self.lsp_query_helper.initialize_directory(file)
        file_nodes = self.create_file_nodes(file, parent_folder)
        self.graph.add_nodes(file_nodes)

        file_node = self.get_file_node_from_file_nodes(file_nodes)
        file_node.skeletonize()

        parent_folder.relate_node_as_contain_relationship(file_node)

    def get_file_node_from_file_nodes(self, file_nodes) -> "FileNode":
        # File node should always be the first node in the list
        for node in file_nodes:
            if node.label == NodeLabels.FILE:
                return node

        raise ValueError("File node not found in file nodes")

    def create_file_nodes(self, file: "File", parent_folder: "FolderNode") -> List["Node"]:
        document_symbols = self.tree_sitter_helper.create_nodes_and_relationships_in_file(
            file, parent_folder=parent_folder
        )
        return document_symbols

    def create_relationships_from_references(self) -> None:
        file_nodes = self.graph.get_nodes_by_label(NodeLabels.FILE)

        references_relationships = []
        for file_node in file_nodes:
            nodes = self.graph.get_nodes_by_path(file_node.path)
            for node in nodes:
                if node.label == NodeLabels.FILE:
                    continue

                references_relationships.extend(self.create_node_relationships(node))
        self.graph.add_references_relationships(references_relationships=references_relationships)

    def create_node_relationships(self, node: "Node") -> List["Relationship"]:
        references = self.lsp_query_helper.get_paths_where_node_is_referenced(node)
        print(f"References found for {node.name}: {len(references)}")
        print(f"References: {references}")
        relationships = RelationshipCreator.create_relationships_from_paths_where_node_is_referenced(
            references=references, node=node, graph=self.graph, tree_sitter_helper=self.tree_sitter_helper
        )

        return relationships
