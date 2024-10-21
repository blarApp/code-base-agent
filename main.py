from Graph.ProjectGraphCreator import ProjectGraphCreator
from LSP import LspCaller


def main():
    lsp_caller = LspCaller()
    graph = ProjectGraphCreator("Test", lsp_caller)

    graph.build()
    graph.print()


if __name__ == "__main__":
    main()
