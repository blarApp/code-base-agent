from Graph.ProjectGraphCreator import ProjectGraphCreator
from LSP import LspCaller
from ProjectFilesIterator import ProjectFilesIterator
from DbManagers.Neo4jManager import Neo4jManager


def main():
    lsp_caller = LspCaller()
    project_files_iterator = ProjectFilesIterator(
        "/home/juan/devel/blar/lsp-poc/",
        paths_to_skip=[
            "/home/juan/devel/blar/lsp-poc/__pycache__",
            "/home/juan/devel/blar/lsp-poc/.git",
            "/home/juan/devel/blar/lsp-poc/.venv",
            "/home/juan/devel/blar/lsp-poc/Graph/__pycache__",
            "/home/juan/devel/blar/lsp-poc/Graph/Node/__pycache__",
            "/home/juan/devel/blar/lsp-poc/Graph/Relationship/__pycache__",
            "/home/juan/devel/blar/lsp-poc/LSP/__pycache__",
        ],
    )

    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_creator = ProjectGraphCreator("Test", lsp_caller, project_files_iterator)

    graph = graph_creator.build()


if __name__ == "__main__":
    main()
