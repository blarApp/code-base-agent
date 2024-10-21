from Graph.ProjectGraphCreator import ProjectGraphCreator
from LSP import LspCaller
from ProjectFilesIterator import ProjectFilesIterator
from DbManagers.Neo4jManager import Neo4jManager


def main():
    lsp_caller = LspCaller()
    project_files_iterator = ProjectFilesIterator(
        "/home/juan/devel/blar/lsp-poc/",
        blarignore_path="/home/juan/devel/blar/lsp-poc/.blarignore",
    )

    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_creator = ProjectGraphCreator("Test", lsp_caller, project_files_iterator)

    graph = graph_creator.build()

    relationships = graph.get_relationships_as_objects()
    nodes = graph.get_nodes_as_objects()

    graph_manager.save_graph(nodes, relationships)


if __name__ == "__main__":
    main()
