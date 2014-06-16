var MOVE_DELAY = 1000;

function newPlayer(gm){
	var gp = new ScoreMaxer(gm, 4, .7);
	gp.init();
	return gp;
}

var directions = ["up", "right", "down", "left"];

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

	function prepareTiles(grid) {
	  grid.eachCell(function (x, y, tile) {
		if (tile) {
		  tile.mergedFrom = null;
		  tile.savePosition();
		}
	  });
	};
/**********/

/* HELPERS */

// compare 2 objects by multiple properties with properties considered in order in the array
// the first property found to be inequal decides which is larger
function getMaxObjectMultiProp(obj1, obj2, props){
    for(var i = 0; i < props.length; i++){
        var prop = props[i];
        
        if(obj1[prop] > obj2[prop]){
            // obj1 is larger
            return obj1;   
        } else if(obj2[prop] > obj1[prop]){
            // obj2 is larger
            return obj2;
        }
    }
    
    // if we complete the loop, the objects are considered equal, just return one
    return obj1;
}

// returns an object with various stats about the max tile
function getMaxTileInfo(grid){
	var returnValue = {
		maxVal: 0,
		isMaxInCorner: false,
		isMaxCornerUnmoved: false
	};

	// get max cell(s)
	var maxTiles = [];

	grid.eachCell(function(x, y, tile){
		if(tile){
			if(tile.value == returnValue.maxVal){
				// add tile to array of max tiles
				maxTiles.push(tile);
			} else if(tile.value > returnValue.maxVal){
				// replace the existing array with a new one containing this tile
				returnValue.maxVal = tile.value;
				maxTiles = [tile];
			}
		}
	});

	// check if any of max tiles are in a corner
	for(var i = 0; i < maxTiles.length; i++){
		var tile = maxTiles[i];

		if((tile.x==0 || tile.x==grid.size-1) && (tile.y==0 || tile.y==grid.size-1)){
			// tile is in corner
			returnValue.isMaxInCorner = true;

			// get previous position
			var oldPos;
			if(!tile.mergedFrom){
				oldPos = tile.previousPosition;

				if(tile.x == oldPos.x && tile.y == oldPos.y){
					// max-corner tile is in same position as previous
					returnValue.isMaxCornerUnmoved = true;
				}
			} else {
				// tile was merged, get original position of pre-merge tiles
				oldPos = tile.mergedFrom[0].previousPosition;

				if(tile.x == oldPos.x && tile.y == oldPos.y){
					// max-corner tile is in same position as previous
					returnValue.isMaxCornerUnmoved = true;
				}

				oldPos = tile.mergedFrom[1].previousPosition;

				if(tile.x == oldPos.x && tile.y == oldPos.y){
					// max-corner tile is in same position as previous
					returnValue.isMaxCornerUnmoved = true;
				}
			}
		}
	}

	return returnValue;
}

/* makes move based on move with max score */
function ScoreMaxer(gm, searchDepth, depthScale){
	this.searchDepth = searchDepth;
	this.depthScale = depthScale;  // a scale factor to prioritize points at shallower depths

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

/* makes move based on move with max score with priority to keeping highest tile in a corner */
function CornerScoreMaxer(gm, searchDepth, depthScale){
	this.searchDepth = searchDepth;
	this.depthScale = depthScale;  // a scale factor to prioritize points at shallower depths

	this.gm = gm;
	
	this.init = function(){
		this.move();
	};
	
	this.move = function(){
		// check each direction to find the best
		var maxScore = {
			direction: 0,
			score: -1,
			maxInCornerHistory: 0, 
			maxCornerUnmovedHistory: 0
		};

		for(var i=0; i<4; i++){
			var nextScore = this.simulateMove(gm.grid, i, this.searchDepth);

			maxScore = getMaxObjectMultiProp(maxScore, nextScore, ["maxInCornerHistory", "maxCornerUnmovedHistory", "score"]);
		}

		gm.move(maxScore.direction);

		setTimeout(this.move.bind(this), MOVE_DELAY);
	};

	this.simulateMove = function (grid, direction, depth) {
	  // default return value
	  //   "history" values are numbers with "binary flags" indicating related truth value at each depth check in the best case.  
	  //   9 or 1001 would indicate that the related value was true at depth 1 and 4 and false at 2 and 3
	  var returnValue = {
		direction: direction,
		score: -1,
		maxInCornerHistory: 0, 
		maxCornerUnmovedHistory: 0
	  }

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

	  // save previous state to be compared later
	  prepareTiles(grid);

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

	  // if no move, return the default return value with a score of -1
	  if(!moved) return returnValue;

	  // get information about the max tile on the board
	  var maxTileInfo = getMaxTileInfo(grid);

	  returnValue.score = score;

	  if(maxTileInfo.isMaxInCorner){
		// set "bit flag" for this depth
		returnValue.maxInCornerHistory = Math.pow(2, depth-1);
	  }

	  if(maxTileInfo.isMaxCornerUnmoved){
		// set "bit flag" for this depth
		returnValue.maxCornerUnmovedHistory = Math.pow(2, depth-1);
	  }

	  // for depth > 1, make a recursive call with depth -1
	  if(depth>1){
		var maxScore = {
			score: 0,
			maxInCornerHistory: 0, 
			maxCornerUnmovedHistory: 0
		};

		for(var i=0; i<4; i++){
			var nextScore = this.simulateMove(grid, i, depth - 1);

			maxScore = getMaxObjectMultiProp(maxScore, nextScore, ["maxInCornerHistory", "maxCornerUnmovedHistory", "score"]);
		}

		// FACTOR THE MAXSCORE RESULT INTO THE RETURN VALUE FOR THIS CALL
		// score is added with scaling factor
		returnValue.score += (maxScore.score * this.depthScale);

		// history values get bitwise or-ed
		returnValue.maxInCornerHistory |= maxScore.maxInCornerHistory;
		returnValue.maxCornerUnmovedHistory |= maxScore.maxCornerUnmovedHistory;
	  }

	  return returnValue;
	};
}