// Game class definition
class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = false;
        this.speed = 0.15; // Increased initial speed
        this.jumpForce = 0;
        this.gravity = 0.015;
        this.consecutiveJumps = 0;

        // Game balance properties
        this.lastSpeedIncrease = 0;
        this.speedIncreaseInterval = 30000; // 30 seconds
        this.speedMultiplier = 1.05; // 5% increase
        this.minObstacleSpacing = 20;
        this.lastObstacleSpawn = 0;
        this.spawnCooldown = 2000; // Initial spawn cooldown in milliseconds

        // Game objects
        this.player = null;
        this.ground = null;
        this.obstacles = [];

        // Setup scene
        this.setupLights();
        this.setupGround();
        this.setupPlayer();
        this.setupCamera();

        // Event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('touchstart', () => this.jump());

        // UI elements
        this.scoreElement = document.getElementById('score');
        this.startMenu = document.getElementById('start-menu');
        this.gameOverMenu = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');

        // Button listeners
        document.getElementById('start-button').addEventListener('click', () => {
            console.log('Start button clicked');
            this.startGame();
        });
        document.getElementById('retry-button').addEventListener('click', () => {
            console.log('Retry button clicked');
            this.startGame();
        });

        // Start animation loop
        this.animate();
    }

    setupLights() {
        // Add sky background
        const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB, // Bright blue sky
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Add clouds
        this.clouds = [];
        for (let i = 0; i < 10; i++) {
            const cloudGeometry = new THREE.SphereGeometry(5, 8, 8);
            const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                Math.random() * 100 - 50,
                Math.random() * 20 + 20,
                Math.random() * 100 - 150
            );
            cloud.scale.set(1 + Math.random(), 0.8, 1 + Math.random());
            this.clouds.push(cloud);
            this.scene.add(cloud);
        }

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
    }

    setupGround() {
        const groundGeometry = new THREE.BoxGeometry(10, 0.5, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x90EE90 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.position.y = -2;
        this.scene.add(this.ground);
    }

    setupPlayer() {
        // Create a group to hold all player parts
        this.player = new THREE.Group();

        // Head (smaller box)
        const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA07A });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.8;
        this.player.add(head);

        // Body (slightly larger box)
        const bodyGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 }); // Yellow uniform
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.2;
        this.player.add(body);

        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.4, 0.3, 0);
        this.player.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.4, 0.3, 0);
        this.player.add(rightArm);

        // Legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark green pants

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, -0.3, 0);
        this.player.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, -0.3, 0);
        this.player.add(rightLeg);

        this.player.position.y = 0;
        this.scene.add(this.player);
    }

    setupCamera() {
        this.camera.position.set(0, 3, 10);
        this.camera.lookAt(0, 0, 0);
    }

    startGame() {
        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = true;
        this.speed = 0.1;
        this.jumpForce = 0;
        this.consecutiveJumps = 0;
        this.player.position.y = 0;

        // Clear obstacles
        this.obstacles.forEach(obstacle => this.scene.remove(obstacle));
        this.obstacles = [];

        // Update UI
        this.startMenu.style.display = 'none';
        this.gameOverMenu.style.display = 'none';
        this.scoreElement.textContent = 'Score: 0';
    }

    gameOver() {
        this.isGameOver = true;
        this.isPlaying = false;
        this.gameOverMenu.style.display = 'block';
        this.finalScoreElement.textContent = this.score;
    }

    jump() {
        if (this.isPlaying && this.player.position.y <= 0) {
            this.jumpForce = 0.4;
        }
    }

    onKeyDown(event) {
        if (event.code === 'Space') {
            this.jump();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    spawnObstacle() {
        const currentTime = Date.now();
        if (currentTime - this.lastObstacleSpawn < this.spawnCooldown) return;

        // Adjust spawn cooldown based on speed
        this.spawnCooldown = 2000 / (this.speed * 5);

        const isFireObstacle = Math.random() < 0.7; // 70% chance for fire, 30% for nature demons
        const size = isFireObstacle ? Math.random() * 1.5 + 0.5 : 1;

        if (isFireObstacle) {
            // Create fire obstacle group
            const obstacle = new THREE.Group();

            // Create multiple flame shapes
            const flameCount = 3;
            for (let i = 0; i < flameCount; i++) {
                const flameGeometry = new THREE.ConeGeometry(size * 0.5, size * 2, 4);
                const flameMaterial = new THREE.MeshStandardMaterial({
                    color: i === 0 ? 0xFF4500 : (i === 1 ? 0xFF6B00 : 0xFF8C00),
                    emissive: 0xFF4500,
                    emissiveIntensity: 0.5
                });

                const flame = new THREE.Mesh(flameGeometry, flameMaterial);
                flame.position.y = size - 1;
                flame.position.x = (i - 1) * size * 0.4;
                flame.rotation.y = Math.random() * Math.PI;
                obstacle.add(flame);
            }

            obstacle.position.z = -50 - (this.speed * 100); // Spawn further based on speed
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
        } else {
            // Nature demon obstacles (rock golem or leaf sprite)
            const isRockGolem = Math.random() < 0.5;
            const geometry = new THREE.BoxGeometry(size, size * 2, size);
            const material = new THREE.MeshStandardMaterial({
                color: isRockGolem ? 0x808080 : 0x228B22 // Gray for rock, green for leaf
            });
            const obstacle = new THREE.Mesh(geometry, material);
            obstacle.position.z = -50 - (this.speed * 100);
            obstacle.position.y = size - 1;
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
        }

        this.lastObstacleSpawn = currentTime;
    }

    updateObstacles() {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.position.z += this.speed;

            // Check collision
            if (this.checkCollision(obstacle)) {
                this.gameOver();
                return;
            }

            // Remove passed obstacles and update score
            if (obstacle.position.z > 5) {
                this.scene.remove(obstacle);
                this.obstacles.splice(i, 1);
                this.score += 10;
                this.consecutiveJumps++;

                // Bonus points for consecutive jumps
                if (this.consecutiveJumps >= 3) {
                    this.score += 20;
                    this.consecutiveJumps = 0;
                }

                this.scoreElement.textContent = `Score: ${this.score}`;

                // Increase difficulty
                this.speed += 0.001;
            }
        }
    }

    checkCollision(obstacle) {
        const playerBox = new THREE.Box3().setFromObject(this.player);
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        return playerBox.intersectsBox(obstacleBox);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isPlaying) {
            // Update player
            this.player.position.y += this.jumpForce;
            this.jumpForce -= this.gravity;

            // Ground collision
            if (this.player.position.y < 0) {
                this.player.position.y = 0;
                this.jumpForce = 0;
            }

            // Update speed progression
            const currentTime = Date.now();
            if (currentTime - this.lastSpeedIncrease >= this.speedIncreaseInterval) {
                this.speed *= this.speedMultiplier;
                this.lastSpeedIncrease = currentTime;
            }

            // Animate clouds
            this.clouds.forEach((cloud, index) => {
                cloud.position.x += Math.sin(Date.now() * 0.001 + index) * 0.02;
                cloud.position.z += this.speed * 0.5;
                if (cloud.position.z > 50) {
                    cloud.position.z = -150;
                    cloud.position.x = Math.random() * 100 - 50;
                }
            });

            // Spawn and update obstacles
            this.spawnObstacle();
            this.updateObstacles();

            // Move ground
            this.ground.position.z += this.speed;
            if (this.ground.position.z > 500) {
                this.ground.position.z = 0;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});