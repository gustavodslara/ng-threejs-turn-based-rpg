import * as THREE from 'three';
import { World } from './world';
import { getKey } from './utils';

/**
 * Finds the path between the start and end point (if one exists)
 * @param {THREE.Vector3} start 
 * @param {THREE.Vector3} end 
 * @param {World} world 
 * @return {THREE.Vector3[] | null} If path is found, returns the array of
 * coordinates that make up the path, otherwise returns null
 */
export function search(start, end, world) {
  // If the end is equal to the start, skip searching
  if (start.equals(end)) return [];

  //console.log(`Searching for path from (${start.x},${start.z}) to (${end.x},${end.z})`);

  let pathFound = false;
  const maxSearchDistance = 20;

  const cameFrom = new Map();
  const cost = new Map();
  const frontier = [start];
  cost.set(getKey(start), 0);

  let counter = 0;
  while (frontier.length > 0) {
    // Get the square with the shortest distance metric
    // Dijkstra - distance to origin
    // A* - distance to origin + estimated distance to destination
    frontier.sort((v1, v2) => {
      const g1 = start.manhattanDistanceTo(v1);
      const g2 = start.manhattanDistanceTo(v2);
      const h1 = v1.manhattanDistanceTo(end);
      const h2 = v2.manhattanDistanceTo(end);
      const f1 = g1 + h1;
      const f2 = g2 + h2;
      return f1 - f2;
    });

    const candidate = frontier.shift();

    counter++;

    // Did we find the end goal?
    if (candidate.equals(end)) {
      pathFound = true;
      break;
    }

    // If we have exceeded the max search distance, skip to next candidate
    if (candidate.manhattanDistanceTo(start) > maxSearchDistance) {
      continue;
    }

    // Search the neighbors of the square
    const neighbors = getNeighbors(candidate, world, cost);
    frontier.push(...neighbors);

    // Mark which square each neighbor came from
    neighbors.forEach((neighbor) => {
      cameFrom.set(getKey(neighbor), candidate);
    })
  }

  if (!pathFound) return null;

  // Reconstruct the path
  let curr = end;
  const path = [curr];

  //console.log(path);

  while (getKey(curr) !== getKey(start)) {
    const prev = cameFrom.get(getKey(curr));
    path.push(prev);
    curr = prev;
  }

  path.reverse();
  path.shift();

  return path;
}

/**
 * Returns array of coordinates for neighboring squares
 * @param {THREE.Vector3} coords 
 * @param {World} world
 * @param {Map} cost
 */
function getNeighbors(coords, world, cost) {
  let neighbors = [];

  // Left
  if (coords.x > 0) {
    neighbors.push(new THREE.Vector3(coords.x - 1, 0, coords.z));
  }
  // Right
  if (coords.x < world.width - 1) {
    neighbors.push(new THREE.Vector3(coords.x + 1, 0, coords.z));
  }
  // Top
  if (coords.z > 0) {
    neighbors.push(new THREE.Vector3(coords.x, 0, coords.z - 1));
  }
  // Bottom
  if (coords.z < world.height - 1) {
    neighbors.push(new THREE.Vector3(coords.x, 0, coords.z + 1));
  }

  // Cost to get to neighbor square is the current square cost + 1
  const newCost = cost.get(getKey(coords)) + 1;

  // Exclude any squares that are already visited, as well
  // as any squares that are occupied
  neighbors = neighbors
    .filter(coords => {
      // If neighboring square has not yet been visited, or this
      // is a cheaper path cost, then include it in the search
      if (!cost.has(getKey(coords)) || newCost < cost.get(getKey(coords))) {
        cost.set(getKey(coords), newCost);
        return true;
      } else {
        return false;
      }
    })
    .filter(coords => !world.getObject(coords));

  return neighbors;
}