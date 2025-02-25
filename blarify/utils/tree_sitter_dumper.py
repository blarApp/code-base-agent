from tree_sitter import Node


class TreeSitterDumper:
    def __init__(self, parser):
        self.parser = parser

    def dump(self, code):
        tree = self.parser.parse(bytes(code, "utf8"))
        root_node = tree.root_node
        return self.pretty_print(root_node)

    def pretty_print(self, node: Node, indent=0):
        nodes_to_visit = [{"node": node, "indent": indent}]

        while nodes_to_visit:
            node_dict = nodes_to_visit.pop()

            node = node_dict["node"]
            indent = node_dict["indent"]

            node_type = f"\033[94m{node.type}\033[0m"
            start_end_points = f"\033[92m[{node.start_point} - {node.end_point}]\033[0m"
            print("- " * indent + f"{{{node_type}}}: {node.grammar_name} \n\n{node.text.decode('utf-8')}")
            for child in node.named_children:
                nodes_to_visit.append({"node": child, "indent": indent + 1})


if __name__ == "__main__":
    from blarify.code_hierarchy.languages import DartDefinitions

    dumper = TreeSitterDumper(DartDefinitions.get_parsers_for_extensions()[".dart"])
    with open("test.dart") as f:
        code = f.read()
        dumper.dump(code)
