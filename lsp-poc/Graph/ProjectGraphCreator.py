from LSP import LspQueryHelper
from Files import ProjectFilesIterator, Folder, File
from Graph.Node import NodeLabels, NodeFactory, Node, FolderNode
from Graph.Relationship import RelationshipCreator
from TreeSitter import TreeSitterHelper
from typing import List
from Graph.Graph import Graph


class ProjectGraphCreator:
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

    def build(self):
        for folder in self.project_files_iterator:
            self.process_folder(folder)

        self.create_relationships_from_references()
        return self.graph

    def process_folder(self, folder: Folder):
        folder_node = self.add_or_get_folder_node(folder)
        folder_nodes = self.create_subfolder_nodes(folder)
        folder_node.relate_nodes_as_contain_relationship(folder_nodes)

        self.graph.add_nodes(folder_nodes)

        files = folder.files
        self.process_files(files, parent_folder=folder_node)

    def add_or_get_folder_node(self, folder: Folder):
        folder_node = NodeFactory.create_folder_node(folder)

        if self.graph.has_node(folder_node):
            return self.graph.get_node_by_id(folder_node.id)
        else:
            self.graph.add_node(folder_node)
            return folder_node

    def create_subfolder_nodes(self, folder: Folder):
        folder_nodes = self.create_folder_nodes(folder)

        return folder_nodes

    def create_folder_nodes(self, folder: Folder) -> List[Node]:
        nodes = []
        for folder in folder.folders:
            folder_node = self.add_or_get_folder_node(folder)
            nodes.append(folder_node)

        return nodes

    def process_files(self, files: List[File], parent_folder: FolderNode):
        for file in files:
            self.process_file(file, parent_folder)

    def process_file(self, file: File, parent_folder: FolderNode):
        file_nodes = self.create_file_nodes(file)
        self.graph.add_nodes(file_nodes)

        file_node = self.get_file_node_from_file_nodes(file_nodes)

        parent_folder.relate_node_as_contain_relationship(file_node)

    def get_file_node_from_file_nodes(self, file_nodes):
        # File node should always be the first node in the list
        for node in file_nodes:
            if node.label == NodeLabels.FILE:
                return node

        raise ValueError("File node not found in file nodes")

    def create_file_nodes(self, file: File):
        document_symbols = self.tree_sitter_helper.create_nodes_and_relationships_in_file(file)
        return document_symbols

    def create_relationships_from_references(self):
        file_nodes = self.graph.get_nodes_by_label(NodeLabels.FILE)

        references_relationships = []
        for file_node in file_nodes:
            nodes = self.graph.get_nodes_by_path(file_node.path)
            for node in nodes:
                if node.label == NodeLabels.FILE:
                    continue

                references_relationships.extend(self.create_node_relationships(node))
        self.graph.add_references_relationships(references_relationships=references_relationships)

    def create_node_relationships(self, node: Node):
        references = self.lsp_query_helper.get_paths_where_node_is_referenced(node)
        file_node_reference = self.graph.get_file_node_by_path(node.path)
        relationships = RelationshipCreator.create_relationships_from_paths_where_node_is_referenced(
            references=references, node=node, file_node_reference=file_node_reference
        )

        return relationships
