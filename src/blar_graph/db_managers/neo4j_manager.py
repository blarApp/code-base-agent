import os
from typing import Any, List, Dict

from dotenv import load_dotenv
from neo4j import GraphDatabase
from blar_graph.db_managers.base_manager import BaseDBManager

load_dotenv()


class Neo4jManager(BaseDBManager):
    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USERNAME")
        password = os.getenv("NEO4J_PASSWORD")

        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.create_function_name_index()

    def query(self, query: str, result_format: str = "data"):
        with self.driver.session() as session:
            result = session.run(query)
            if result_format == "graph":
                return result.graph()
            return result.data()

    def create_function_name_index(self):
        # Creates a fulltext index on the name and path properties of the nodes
        with self.driver.session() as session:
            node_query = """
            CREATE FULLTEXT INDEX functionNames IF NOT EXISTS FOR (n:CLASS|FUNCTION|FILE) ON EACH [n.name, n.path, n.node_id]
            """
            session.run(node_query)

    def close(self):
        # Close the connection to the database
        self.driver.close()

    def save_graph(self, nodes: List[Any], edges: List[Any]):
        self.create_nodes(nodes)
        self.create_edges(edges)

    def create_nodes(self, nodeList: List[Any]):
        # Function to create nodes in the Neo4j database
        with self.driver.session() as session:
            session.write_transaction(self._create_nodes_txn, nodeList)

    def create_edges(self, edgesList: List[Any]):
        # Function to create edges between nodes in the Neo4j database
        with self.driver.session() as session:
            session.write_transaction(self._create_edges_txn, edgesList)

    def format_query(self, query: str):
        # Function to format the query to be used in the fulltext index
        special_characters = [
            "+",
            "-",
            "&&",
            "||",
            "!",
            "(",
            ")",
            "{",
            "}",
            "[",
            "]",
            "^",
            '"',
            "~",
            "*",
            "?",
            ":",
            "\\",
            "/",
        ]
        for character in special_characters:
            query = query.replace(character, f"\\{character}")
        return query

    def get_node_by_id(self, node_id: str):
        query = """
        MATCH (n)
        WHERE n.node_id = $node_id

        // Collect outgoing relationships
        OPTIONAL MATCH (n)-[r]->(m)
        WITH n, collect({relationType: type(r), node_id: m.node_id, nodeType: labels(m)}) as outgoingRelationships

        // Collect incoming relationships
        OPTIONAL MATCH (n)<-[r]-(m)
        WITH n, outgoingRelationships, collect({relationType: type(r), node_id: m.node_id, nodeType: labels(m)}) as incomingRelationships

        // Aggregate relationships by type
        RETURN properties(n) as properties,
            {
                outgoing: outgoingRelationships,
                incoming: incomingRelationships
            } as relationships

        """
        with self.driver.session() as session:
            result = session.run(query, {"node_id": node_id})
            return result.data()[0]

    def get_code(self, query: str) -> List[Dict[str, Any]]:
        # Function to get code from the Neo4j database based on a keyword query
        formatted_query = self.format_query(query)
        node_query = f"""
    CALL db.index.fulltext.queryNodes("functionNames", "*{formatted_query}") YIELD node, score
    RETURN node, score
        """

        with self.driver.session() as session:
            result = session.run(node_query)
            return result.data()

    def get_graph_by_path(self, path: str):
        node_query = f"""
    MATCH (nodes) WHERE nodes.path CONTAINS $path return nodes
        """
        with self.driver.session() as session:
            result = session.run(node_query, {"path": path})
            return result.data()

    def get_n_hop_neighbours(self, node_id: str, num_hops: int):
        # Function to get code from the Neo4j database based on a keyword query
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (p {node_id: $node_id})
                CALL apoc.neighbors.byhop(p, ">", $num_hops)
                YIELD nodes
                UNWIND [p] + nodes AS all_nodes
                RETURN all_nodes.text AS text
                """,
                node_id=node_id,
                num_hops=num_hops,
            )
            return result.data()

    @staticmethod
    def _create_nodes_txn(tx, nodeList: List[Any]):
        # Transaction function for creating nodes with dynamic labels
        node_query = f"""
    UNWIND $nodeList AS node
    CALL apoc.create.node([node.type], node.attributes)
    YIELD node as n
    RETURN count(n) as createdNodesCount
    """
        result = tx.run(node_query, nodeList=nodeList)

        for record in result:
            print(f"Created {record['createdNodesCount']} nodes")

    @staticmethod
    def _create_edges_txn(tx, edgesList: List[Any]):
        # Transaction function for creating edges
        edge_query = """
    WITH $edgesList AS edges
    UNWIND edges AS edgeObject
    MATCH (node1 {node_id: edgeObject.sourceId})
    MATCH (node2 {node_id: edgeObject.targetId})
    CALL apoc.create.relationship(node1, edgeObject.type, {}, node2)
    YIELD rel
    RETURN rel;
    """
        tx.run(edge_query, edgesList=edgesList)


if __name__ == "__main__":
    graph = Neo4jManager()
    result = graph.get_node_by_id("fc33457f-43dd-414c-b074-1142e724ba30")
    graph.close()
