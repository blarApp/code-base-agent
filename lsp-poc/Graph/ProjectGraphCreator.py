from LSP import LspCaller
from Files import ProjectFilesIterator, Folder
from Graph.Node import NodeLabels, NodeFactory, Node
from Graph.Relationship import Relationship, RelationshipType
from typing import List
from Graph.Graph import Graph


class ProjectGraphCreator:
    def __init__(
        self,
        root_path: str,
        lsp_caller: LspCaller,
        project_files_iterator: ProjectFilesIterator,
    ):
        self.root_path = root_path
        self.lsp_caller = lsp_caller
        self.project_files_iterator = project_files_iterator
        self.graph = Graph()

    def build(self):
        for folder in self.project_files_iterator:
            folder_node = self.create_folder_node(folder)
            nodes = self.create_folder_children_nodes(folder)
            contains_relationships = self.create_contains_relationships(
                folder_node, nodes
            )
            self.graph.add_node(folder_node)
            self.graph.add_nodes(nodes)
            self.graph.add_relationships(contains_relationships)

        return self.graph

    def create_folder_node(self, folder: Folder) -> Node:
        return NodeFactory.create_folder_node(folder)

    def create_folder_children_nodes(self, folder: Folder) -> List[Node]:
        nodes = []
        for file in folder.files:
            nodes.append(NodeFactory.create_file_node(file))

        for folder in folder.folders:
            nodes.append(NodeFactory.create_folder_node(folder))

        return nodes

    def create_contains_relationships(self, container: Node, nodes: List[Node]):
        contains = []
        for node in nodes:
            contains.append(self.create_contains_relationship(container, node))

        return contains

    def create_contains_relationship(self, parent, child):
        return Relationship(
            start_node=parent,
            end_node=child,
            rel_type=RelationshipType.CONTAINS,
        )

    def create_imports_relationship(self, parent, child):
        return Relationship(
            start_node=parent,
            end_node=child,
            rel_type=RelationshipType.IMPORTS,
        )
