import os
from typing import Any, List

from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()


class Neo4jManager:
    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USERNAME")
        password = os.getenv("NEO4J_PASSWORD")

        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        # Close the connection to the database
        self.driver.close()

    def create_nodes(self, nodeList: List[Any]):
        # Function to create nodes in the Neo4j database
        with self.driver.session() as session:
            session.write_transaction(self._create_nodes_txn, nodeList)

    def create_edges(self, edgesList: List[Any]):
        # Function to create edges between nodes in the Neo4j database
        with self.driver.session() as session:
            session.write_transaction(self._create_edges_txn, edgesList)

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
    CREATE (node1)-[:CHILD]->(node2)
    """
        tx.run(edge_query, edgesList=edgesList)
