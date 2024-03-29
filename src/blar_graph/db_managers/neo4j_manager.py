import os
from typing import Any, List, Dict
from blar_graph.db_managers.base_manager import BaseDBManager
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()


class Neo4jManager(BaseDBManager):
    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USERNAME")
        password = os.getenv("NEO4J_PASSWORD")

        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.create_function_name_index()
        self.create_node_id_index()

    def query(self, query: str, result_format: str = "data"):
        with self.driver.session() as session:
            result = session.run(query)
            if result_format == "graph":
                return result.graph()
            return result.data()
        
    def save_graph(self, nodes: List[Any], edges: List[Any]):
        self.create_nodes(nodes)
        self.create_edges(edges)

    def create_function_name_index(self):
        # Creates a fulltext index on the name and path properties of the nodes
        with self.driver.session() as session:
            node_query = """
            CREATE FULLTEXT INDEX functionNames IF NOT EXISTS FOR (n:CLASS|FUNCTION|FILE) ON EACH [n.name, n.path, n.node_id]
            """
            session.run(node_query)

    def create_node_id_index(self):
        with self.driver.session() as session:
            node_types = ["CLASS", "FUNCTION", "FILE", "PACKAGE", "FOLDER"]
            for node_type in node_types:
                node_query = f"""
                CREATE INDEX node_id IF NOT EXISTS FOR (n:{node_type}) ON (n.node_id)
                """
                session.run(node_query)

    def close(self):
        # Close the connection to the database
        self.driver.close()

    def create_nodes(self, nodeList: List[Any]):
        # Function to create nodes in the Neo4j database
        with self.driver.session() as session:
            session.write_transaction(self._create_nodes_txn, nodeList, 10000)

    def create_edges(self, edgesList: List[Any]):
        # Function to create edges between nodes in the Neo4j database
        with self.driver.session() as session:
            session.write_transaction(self._create_edges_txn, edgesList, 10000)

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

    def get_code(self, query: str):
        # Function to get code from the Neo4j database based on a keyword query
        formatted_query = self.format_query(query)
        node_query = f"""
    CALL db.index.fulltext.queryNodes("functionNames", "*{formatted_query}") YIELD node, score
    RETURN node.text, node.node_id, node.name, score
        """
        node_query2 = f"""
    CALL db.index.fulltext.queryNodes("functionNames", "{formatted_query}") YIELD node, score
    RETURN node.text, node.node_id, node.name, score
        """
        with self.driver.session() as session:
            result = session.run(node_query)
            first_result = result.peek()
            if first_result is None:
                result = session.run(node_query2)
                first_result = result.peek()
            neighbours = self.get_n_hop_neighbours(first_result["node.node_id"], 1)
            return first_result, neighbours

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
                UNWIND nodes AS all_nodes
                RETURN all_nodes.node_id AS node_id, all_nodes.name AS function_name, labels(all_nodes) AS labels
                """,
                node_id=node_id,
                num_hops=num_hops,
            )
            data = result.data()
            # Construct list of objects containing node_id and function_name
            nodes_info = [
                {"node_id": record["node_id"], "function_name": record["function_name"], "labels": record["labels"]}
                for record in data
            ]
            return nodes_info

    @staticmethod
    def _create_nodes_txn(tx, nodeList: List[Any], batch_size: int):
        # Revised Cypher query using apoc.periodic.iterate for creating nodes
        node_creation_query = """
        CALL apoc.periodic.iterate(
            "UNWIND $nodeList AS node RETURN node",
            "CALL apoc.create.node([node.type], node.attributes) YIELD node as n RETURN count(n) as count",
            {batchSize:$batchSize, parallel:true, iterateList: true, params:{nodeList:$nodeList}}
        )
        YIELD batches, total, errorMessages, updateStatistics
        RETURN batches, total, errorMessages, updateStatistics
        """

        result = tx.run(node_creation_query, nodeList=nodeList, batchSize=batch_size)

        # Fetch the result
        for record in result:
            total = record["total"]
            batches = record["batches"]
            error_messages = record["errorMessages"]
            update_statistics = record["updateStatistics"]
            print(f"Created {record['total']} nodes")

    @staticmethod
    def _create_edges_txn(tx, edgesList: List[Any], batch_size: int):
        # Cypher query using apoc.periodic.iterate for creating edges
        edge_creation_query = """
        CALL apoc.periodic.iterate(
            'WITH $edgesList AS edges UNWIND edges AS edgeObject RETURN edgeObject',
            'MATCH (node1 {node_id: edgeObject.sourceId}) MATCH (node2 {node_id: edgeObject.targetId}) CALL apoc.create.relationship(node1, edgeObject.type, {}, node2) YIELD rel RETURN rel',
            {batchSize:$batchSize, parallel:true, iterateList: true, params:{edgesList:$edgesList}}
        )
        YIELD batches, total, errorMessages, updateStatistics
        RETURN batches, total, errorMessages, updateStatistics
        """
        # Execute the query
        result = tx.run(edge_creation_query, edgesList=edgesList, batchSize=batch_size)

        # Fetch the result
        for record in result:
            total = record["total"]
            batches = record["batches"]
            error_messages = record["errorMessages"]
            update_statistics = record["updateStatistics"]
            print(f"Created {record['total']} edges")


if __name__ == "__main__":
    graph = Neo4jManager()
    result = graph.get_node_by_id("fc33457f-43dd-414c-b074-1142e724ba30")
    graph.close()
