from Graph.ProjectGraphCreator import ProjectGraphCreator
from Files import ProjectFilesIterator
from DbManagers.Neo4jManager import Neo4jManager
from LSP import LspQueryHelper, LspCaller
from Files import File


def main():
    lsp_caller = LspCaller()
    lsp_query_helper = LspQueryHelper(lsp_caller)
    lsp_query_helper.start()

    project_files_iterator = ProjectFilesIterator(
        "/home/juan/devel/blar/lsp-poc/",
        blarignore_path="/home/juan/devel/blar/lsp-poc/.blarignore",
    )

    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_creator = ProjectGraphCreator(
        "Test", lsp_query_helper, project_files_iterator
    )

    graph = graph_creator.build()

    relationships = graph.get_relationships_as_objects()
    nodes = graph.get_nodes_as_objects()

    graph_manager.save_graph(nodes, relationships)


def call_query_helper():
    lsp_caller = LspCaller(root_uri="file:///home/juan/devel/blar/git-webhook-tester")
    query_helper = LspQueryHelper(lsp_caller)
    query_helper.start()

    file = File("main.py", "/home/juan/devel/blar/git-webhook-tester")
    print(file.uri_path)
    imports = query_helper.create_document_symbols_nodes_for_file_node(file)


if __name__ == "__main__":
    # call_query_helper()
    main()
