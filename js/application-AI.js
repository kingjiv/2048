function updateMoveDelay(){
	var mps = document.getElementById("mps").value;

	MOVE_DELAY = 1000/mps;
}

// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  var gm = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  
  // set up the moves per second controls
  document.getElementById("mps-update-button").addEventListener('click', updateMoveDelay, false);

  var gp = newPlayer(gm); 

/*
  var RUNS = 3;
  var runCount = 0;
  var depth = 4;
  var scale = .5;

  var minScale = .5;
  var maxScale = .8;
  var scaleIncrement = .1;

  var maxScore = 0;
  var maxTileVal = 0;

  var totalScore = 0;
  var maxTileTotal = 0;
  var winCount = 0;

  // start fresh
  gm.restart();

console.log((new Date()) + " START");

  var gp = new CornerScoreMaxer(gm, depth, scale);
  gp.init();

  // MONITOR
  function checkState(){
	if(gm.won) gm.inputManager.emit("keepPlaying");

	if (gm.isGameTerminated()){
		var maxTile = 0;

		// get max cell value
		gm.grid.eachCell(function(x, y, tile){
			maxTile = Math.max(maxTile, tile.value);
		});

		//console.log("\t\tscore: " + gm.score + " maxTile: " + maxTile);

		maxScore = Math.max(maxScore, gm.score);
		maxTileVal = Math.max(maxTileVal, maxTile);

	    totalScore += gm.score;
		maxTileTotal += maxTile;

		if(maxTile >= 2048) winCount++;

		runCount ++;
		
		if(runCount == RUNS){
			console.log((new Date()) + "FINISHED \tdepth: " + depth + " \tscale: " + scale + " \tmaxScore: " + maxScore + " \tmaxTile: " + maxTileVal + " \twinCount: " + winCount + " \tavgScore: " + Math.round(totalScore / RUNS) + " \tavgMaxTile: " + Math.round(maxTileTotal / RUNS) + "\t");

			// next
			if(scale >= maxScale){
				scale = minScale;
				depth++;
			} else {
				// rounding to adjust floating point error
				scale = Math.round((scale + scaleIncrement) * 100) / 100;
			}

			gp.searchDepth = depth;
			gp.depthScale = scale;

			runCount = 0;
			maxScore = 0;
			maxTileVal = 0;
			totalScore = 0;
			maxTileTotal = 0;
			winCount = 0;
		}

		gm.restart();
	}
	
	setTimeout(checkState, 10);
  }

  setTimeout(checkState, 10);
  */
});