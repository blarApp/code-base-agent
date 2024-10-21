from Graph.ProjectGraphCreator import ProjectGraphCreator


def main():
    graph = ProjectGraphCreator("Test")

    graph.build()
    graph.print()


if __name__ == "__main__":
    main()
