from blarify.project_graph_creator import ProjectGraphCreator
from blarify.graph.graph import Graph
from blarify.code_references.lsp_helper import LspQueryHelper
from blarify.project_file_explorer import ProjectFilesIterator
from blarify.graph.node import FileNode
from typing import List


class ProjectGraphDiffCreator(ProjectGraphCreator):
    diff_identifier: str

    def __init__(
        self,
        root_path: str,
        lsp_query_helper: LspQueryHelper,
        project_files_iterator: ProjectFilesIterator,
        paths_to_create: list,
        diff_identifier: str,
    ):
        super().__init__(root_path, lsp_query_helper, project_files_iterator)
        self.graph = Graph()
        self.paths_to_create = paths_to_create
        self.diff_identifier = diff_identifier

    def keep_only_files_to_create(self):
        self.graph.filter_graph_by_paths(self.paths_to_create)

    def build(self) -> Graph:
        self.create_code_hierarchy()
        self.create_relationship_from_references_for_paths_to_create()
        self.keep_only_files_to_create()

        return self.graph

    def create_relationship_from_references_for_paths_to_create(self):
        file_nodes = self.get_file_nodes_from_path_list(self.paths_to_create)
        self.mark_file_nodes_as_diff(file_nodes)

        paths = self.get_paths_referenced_by_file_nodes(file_nodes)
        paths = self.remove_paths_to_create_from_paths_referenced(paths)

        file_nodes.extend(self.get_file_nodes_from_path_list(paths))
        self.create_relationship_from_references(file_nodes=file_nodes)

    def get_paths_referenced_by_file_nodes(self, file_nodes):
        paths = set()
        for file in file_nodes:
            paths.update(self.get_paths_referenced_by_file_node(file))
        return paths

    def mark_file_nodes_as_diff(self, file_nodes: List[FileNode]):
        for file_node in file_nodes:
            file_node.add_extra_label_to_self_and_children("DIFF")
            file_node.add_extra_attribute_to_self_and_children("diff_identifier", self.diff_identifier)

    def remove_paths_to_create_from_paths_referenced(self, paths_referenced):
        return [path for path in paths_referenced if path not in self.paths_to_create]

    def get_paths_referenced_by_file_node(self, file_node) -> set:
        helper = self._get_tree_sitter_for_file_extension(file_node.extension)
        definitions = file_node.get_all_definition_ranges()
        identifiers = helper.get_all_identifiers(file_node)
        filtered_identifiers = self.remove_definitions_from_identifiers(definitions, identifiers)

        return {self.lsp_query_helper.get_definition_path_for_reference(ref) for ref in filtered_identifiers}

    def remove_definitions_from_identifiers(self, definitions, identifiers):
        return [identifier for identifier in identifiers if identifier not in definitions]

    def get_file_nodes_from_path_list(self, paths):
        file_nodes = []
        for path in paths:
            file_node = self.graph.get_file_node_by_path(path)

            if file_node:
                file_nodes.append(file_node)
        return file_nodes
