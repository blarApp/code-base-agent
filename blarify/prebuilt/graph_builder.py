from blarify.code_references.lsp_helper import LspQueryHelper
from blarify.graph.graph import Graph
from blarify.project_file_explorer.project_files_iterator import ProjectFilesIterator
from blarify.project_graph_creator import ProjectGraphCreator


class GraphBuilder:
    def __init__(
        self,
        root_path: str,
        extensions_to_skip: list[str] = None,
        names_to_skip: list[str] = None,
    ):
        """
        A class responsible for constructing a graph representation of a project's codebase.

        Args:
            root_path: Root directory path of the project to analyze
            extensions_to_skip: File extensions to exclude from analysis (e.g., ['.md', '.txt'])
            names_to_skip: Filenames/directory names to exclude from analysis (e.g., ['venv', 'tests'])

        Example:
            builder = GraphBuilder(
                    "/path/to/project",
                    extensions_to_skip=[".json"],
                    names_to_skip=["__pycache__"]
                )
            project_graph = builder.build()

        """

        self.root_path = root_path
        self.extensions_to_skip = extensions_to_skip or []
        self.names_to_skip = names_to_skip or []

        self.repo_id = "REPO"
        self.entity_id = "BLARIFY"

    def build(self) -> Graph:
        lsp_query_helper = self._get_started_lsp_query_helper()
        project_files_iterator = self._get_project_files_iterator()

        graph_creator = ProjectGraphCreator(self.root_path, lsp_query_helper, project_files_iterator)
        graph = graph_creator.build()
        lsp_query_helper.shutdown_exit_close()

        return graph

    def _get_project_files_iterator(self):
        return ProjectFilesIterator(
            root_path=self.root_path, extensions_to_skip=self.extensions_to_skip, names_to_skip=self.names_to_skip
        )

    def _get_started_lsp_query_helper(self):
        lsp_query_helper = LspQueryHelper(root_uri=self.root_path)
        lsp_query_helper.start()
        return lsp_query_helper
