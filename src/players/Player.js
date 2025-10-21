import * as THREE from 'three';
import { GameObject } from '../objects/GameObject';
import { Action, MeleeAttackAction, MovementAction, RangedAttackAction, WaitAction } from '../actions';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();

/**
 * Base player class that human and computer players derive from
 */
export class Player extends GameObject {
  name = 'Player';

  /**
   * @type {THREE.AnimationMixer}
   */
  mixer = null;

  /**
   * @type {Map<string, THREE.AnimationClip>}
   */
  animations = new Map();

  /**
   * @type {THREE.AnimationAction}
   */
  currentAction = null;

  /**
   * @type {GameObject}
   */
  opponent = null;

  /**
   * Instantiates a new instance of the player
   * @param {THREE.Vector3} coords 
   * @param {number} tintColor - The color to tint the player model (e.g., 0xff0000 for red, 0x0000ff for blue)
   */
  constructor(coords, tintColor = 0xff0000) {
    super(coords, new THREE.Mesh());

    this.healthOverlay.visible = true;

    // Load the player model with animations
    loader.load('models/player.glb', (gltf) => {
      const model = gltf.scene;
      model.position.set(0.5, 0, 0.5);
      
      // Apply tint color to all meshes in the model
      model.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone(); // Clone material to avoid sharing
          child.material.color.set(tintColor);
        }
      });

      this.mesh.add(model);

      // Set up animation mixer
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        
        // Store animations by name
        gltf.animations.forEach((clip) => {
          this.animations.set(clip.name, clip);
        });

        // Log available animations for debugging
        console.log('Available animations for player:', Array.from(this.animations.keys()));

        // Play idle/standby animation by default
        this.playAnimation('idle', true);
      }

      // Face opponent if set
      if (this.opponent) {
        this.faceTarget(this.opponent);
      }
    });

    this.moveTo(coords);
  }

  /**
   * Set the opponent to face
   * @param {GameObject} opponent 
   */
  setOpponent(opponent) {
    this.opponent = opponent;
    this.faceTarget(opponent);
  }

  /**
   * Make the player face a target
   * @param {GameObject} target 
   */
  faceTarget(target) {
    if (!target || !target.position) return;
    
    // Calculate direction to target
    const direction = new THREE.Vector3();
    direction.subVectors(target.position, this.position);
    direction.y = 0; // Keep rotation only on horizontal plane
    
    if (direction.length() > 0.1) {
      const angle = Math.atan2(direction.x, direction.z);
      this.rotation.y = angle;
    }
  }

  /**
   * Play an animation by name
   * @param {string} animationName - Name of the animation to play
   * @param {boolean} loop - Whether to loop the animation
   */
  playAnimation(animationName, loop = false) {
    if (!this.mixer || this.animations.size === 0) {
      return;
    }

    // Try to find the animation with various naming conventions
    const possibleNames = this.getAnimationVariants(animationName);
    let clip = null;
    
    for (const name of possibleNames) {
      if (this.animations.has(name)) {
        clip = this.animations.get(name);
        break;
      }
    }

    if (!clip) {
      // Only log once per animation name
      if (!this._loggedMissingAnimations) {
        this._loggedMissingAnimations = new Set();
      }
      if (!this._loggedMissingAnimations.has(animationName)) {
        console.warn(`Animation '${animationName}' not found. Available animations:`, Array.from(this.animations.keys()));
        this._loggedMissingAnimations.add(animationName);
      }
      return;
    }

    // Stop current animation completely
    if (this.currentAction) {
      this.currentAction.fadeOut(0.1);
      this.currentAction.stop();
    }

    // Play new animation
    this.currentAction = this.mixer.clipAction(clip);
    this.currentAction.reset();
    this.currentAction.fadeIn(0.1);
    this.currentAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
    this.currentAction.clampWhenFinished = true;
    this.currentAction.play();
  }

  /**
   * Get possible animation name variations
   * @param {string} baseName 
   * @returns {string[]}
   */
  getAnimationVariants(baseName) {
    const variants = [
      baseName,
      baseName.toLowerCase(),
      baseName.toUpperCase(),
      baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase()
    ];

    // Add common variations
    if (baseName === 'idle') {
      variants.push('Idle', 'idle', 'IDLE', 'standby', 'Standby', 'stand', 'Stand');
    } else if (baseName === 'walk') {
      variants.push('Walk', 'walk', 'WALK', 'walking', 'Walking', 'run', 'Run');
    } else if (baseName === 'melee') {
      variants.push('Melee', 'melee', 'MELEE', 'attack', 'Attack', 'melee_attack', 'MeleeAttack', 'close_attack', 'CloseAttack');
    } else if (baseName === 'ranged') {
      variants.push('Ranged', 'ranged', 'RANGED', 'shoot', 'Shoot', 'ranged_attack', 'RangedAttack', 'long_attack', 'LongAttack');
    }

    return variants;
  }

  /**
   * Update the animation mixer
   * @param {number} deltaTime 
   */
  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  /**
   * @returns {Action[]}
   */
  getActions() {
    return [
      new MovementAction(this),
      new MeleeAttackAction(this),
      new RangedAttackAction(this),
      new WaitAction()
    ]
  }

  /**
   * Wait for the player to choose a target square
   * @returns {Promise<Vector3 | null>}
   */
  async getTargetSquare() {
    return null;
  }

  /**
   * Wait for the player to choose a target GameObject
   * @returns {Promise<GameObject | null>}
   */
  async getTargetObject() {
    return null;
  }

  /**
   * Wait for the player to select an action to perform
   * @returns {Promise<Action | null>}
   */
  async requestAction() {
    return null;
  }
}