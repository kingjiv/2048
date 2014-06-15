var MOVE_DELAY = 500;


function newPlayer(gm){
	var gp = new ScoreMaxer(gm, 4, .7);
	gp.init();
	return gp;
}


/* tries to move blocks to the top and left */
function TopLefter(gm){
	this.gm = gm;
	
	this.init = function(){
		this.move();
	};
	
	this.move = function(){
		// 0: up, 1: right, 2: down, 3: left
		this.makeMoves([3,0], function(moved){ 
			if(!moved){
				this.makeMoves([1,3], function(moved){
					if(!moved){
						this.makeMoves([2,0], this.move);
					} else {
						this.move();
					}
				});
			} else {
				this.move();
			}
		});
	};
	
	// moves is a single int with a move or an array of moves
	// callback is a function which is passed a bool indicating if any of the moves were successful
	this.makeMoves = function(moves, callback, moved){
		if(!(moves instanceof Array)){
			moves = [moves];
		}
		
		var moved = !!moved;
		var delay = 10;
		var gm = this.gm;
		
		var thisMoved = gm.move(moves[0]);
		moved = moved || thisMoved;
		
		if(thisMoved) delay = MOVE_DELAY;
		
		if(moves.length > 1){
			setTimeout(this.makeMoves.bind(this, moves.slice(1), callback, moved), delay);
		} else {
			if(callback){
				var that = this;
				setTimeout(function(){
					callback.call(that, moved);
				}, delay);
			}
		}
	};
}

/* makes move based on move with max score */
function ScoreMaxer(gm, searchDepth, depthScale){
	this.searchDepth = 4;
	this.depthScale = .5;  // a scale factor to prioritize points at shallower depths

	this.gm = gm;
	
	this.init = function(){
		this.move();
	};
	
	this.move = function(){
		// check each direction to find the best
		var dir = 0;
		var score = -1; 

		for(var i=0; i<4; i++){
			var moveScore = this.simulateMove(gm.grid, i, this.searchDepth);

			if(moveScore > score){
				score = moveScore;
				dir = i;
			}
		}

		gm.move(dir);

		setTimeout(this.move.bind(this), MOVE_DELAY);
	};

	/* functions modified from game_manager needed to simulate move */
	function findFarthestPosition(grid, cell, vector) {
	  var previous;

	  // Progress towards the vector direction until an obstacle is found
	  do {
		previous = cell;
		cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
	  } while (grid.withinBounds(cell) &&
			   grid.cellAvailable(cell));

	  return {
		farthest: previous,
		next: cell // Used to check if a merge is required
	  };
	}

	function moveTile(grid, tile, cell) {
	  grid.cells[tile.x][tile.y] = null;
	  grid.cells[cell.x][cell.y] = tile;
	  tile.updatePosition(cell);
	}

	this.simulateMove = function (grid, direction, depth) {
	  // 0: up, 1: right, 2: down, 3: left
	  var gm = this.gm;

	  var cell, tile;

	  var score = 0;

	  var vector     = gm.getVector(direction);
	  var traversals = gm.buildTraversals(vector);
	  var moved      = false;

	  // create a copy of the grid
	  var gridSerial = grid.serialize();
	  var grid = new Grid(gridSerial.size, gridSerial.cells);

	  // Traverse the grid in the right direction and move tiles
	  traversals.x.forEach(function (x) {
		traversals.y.forEach(function (y) {
		  cell = { x: x, y: y };
		  tile = grid.cellContent(cell);

		  if (tile) {
			var positions = findFarthestPosition(grid, cell, vector);
			var next      = grid.cellContent(positions.next);

			// Only one merger per row traversal?
			if (next && next.value === tile.value && !next.mergedFrom) {
			  var merged = new Tile(positions.next, tile.value * 2);
			  merged.mergedFrom = [tile, next];

			  grid.insertTile(merged);
			  grid.removeTile(tile);

			  // Converge the two tiles' positions
			  tile.updatePosition(positions.next);

			  // Update the score
			  score += merged.value;

			} else {
			  moveTile(grid, tile, positions.farthest);
			}

			if (!gm.positionsEqual(cell, tile)) {
			  moved = true; // The tile moved from its original cell!
			}
		  }
		});
	  });

	  if(!moved) return -1;

	  if(depth>1){
		var maxScore = 0;

		for(var i=0; i<4; i++){
			maxScore = Math.max(maxScore, this.simulateMove(grid, i, depth - 1));
		}

		score += (maxScore * this.depthScale);
	  }

	  return score;
	};
}