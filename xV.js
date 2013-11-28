


/**
 * Visalization framework
 *
 * @version 0.1
 * @author Raul Kalvo
 */
var xV = {};


/** Tiles */
xV.Tiles = {};

/**
 * @class
 * @author Raul Kalvo
 *
 * @param {Number} x The x value of the vector
 */

xV.Tiles.Tile = function(){

    this.long   = null; // double >> y
    this.lat    = null; // double >> x
    this.x      = null; // int >> lat
    this.y      = null; // int >> long
    this.z      = null; // int // zoom level
    this.qKey   = null; // int

    this.tileHeight =  256; // px
    this.tileWidht =  256; // px
}

xV.Tiles.Tile.prototype = {

    initByGeo: function(lat, long, zoom){

        // lat = [-90 to 90] degrees
        // long = [-180 to 180] degrees

        this.lat        = lat;
        this.long       = long;

        sinLatitude = Math.sin(lat * Math.PI/180);

        var pxx =  ((long  + 180)/360) * this.tileWidht * Math.pow(2, zoom);
        var pxy =  (0.5 - Math.log(( 1 - sinLatitude )  / (1-sinLatitude)) / (4  * Math.PI)) * this.tileHeight * Math.pow(2, zoom);

        this.x = Math.floor(pxx / this.tileWidht);
        this.y = Math.floor(pxy / this.tileHeight);

        this.setQKeyByTile(this.x, this.y, this.z);


    },

    setQKey : function(QKey){

        this.qKey = QKey;

    },

    setQKeyByTile : function(x, y, z){

        quadKey  = [];

        for (i = z; i > 0; i--)
        {

            digit = '0';
            mask = 1 << (i - 1);
            if ((x & mask) != 0)
            {
                digit++;
            }
            if ((y & mask) != 0)
            {
                digit++;
                digit++;
            }

            quadKey.push(digit);

        }

        this.qKey = quadKey.join("");


    },

    setTileByQKey : function(qKey){

        this.x = 0;
        this.y = 0;
        this.z =  qKey.length;

        for (var i = this.z; i > 0; i--){

            var mask = 1 << (i-1);
            var s = qKey.substr(this.z - i, 1);

            switch (s){

                case "0":
                    break;

                case "1":
                    this.x |= mask;
                    break;

                case "2":
                    this.y |= mask;
                    break;

                case "3":
                    this.x |= mask;
                    this.y |= mask;
                    break;

                default:
                    console.log("can not convert QuadKey " + qKey + " to Tiles");

            }


        }

    },

    moveRight : function(units) {

        this.x = this.x + units;
        if (this.x < 0){
            this.x =  0;
        }
        mx = Math.pow(2, this.z)-1;
        if (this.x > mx){
            this.x = mx;
        }

        this.setQKeyByTile(this.x, this.y, this.z);


    },

    moveDown : function(units) {

        this.y = this.y + units;
        if (this.y < 0){
            this.y =  0;
        }
        mx = Math.pow(2, this.z)-1;
        if (this.y > mx){
            this.y = mx;
        }

        this.setQKeyByTile(this.x, this.y, this.z);


    }


}

/**
 * @class This class is managing all tiles.
 * @author Raul Kalvo
 * @param object = {
 * DB : database address,
 * zoom : zoom level,
 * conf? : 0.0 to 1.0. If returning image then what is that size,
 * UpLeft : (lat, long),
 * BottomRight : (lat, long),
 *
 * }
 */
xV.Tiles.Manager = function( tileObject ){

  if (tileObject != null){

//      var tileObject = {
//
//          DB : "",
//          UpLeft : {
//              lat : 0,
//              long : 0
//          },
//          UpLeftAddress :  undefined,
//          BottomRight : {
//              lat : 0,
//              long : 0
//          },
//          BottomRightAddress : undefined,
//          Zoom : 0,
//          Coef : 1
//
//      }

      this.db = null;
      this.zoom = 1;
      this.coef = 1;

      this.UpLeftTile = null;
      this.BottomRightTile = null;


      if ("DB" in tileObject) {
          this.db = tileObject.db;
      }

      if ("Zoom" in tileObject) {
          this.zoom = tileObject.zoom;
      }

      if ("Coef" in tileObject) {

          this.coef = tileObject.coef;

      }

      if ("UpLeft" in tileObject && "Zoom" in tileObject) {

          this.UpLeftTile = new xV.Tiles.Tile();
          this.UpLeftTile.initByGeo(tileObject.UpLeft.lat, tileObject.UpLeft.long, this.zoom);

      }

      if ("UpLeftQKey" in tileObject) {

          this.BottomRightTile = new xV.Tiles.Tile();
          this.BottomRightTile.setQKey(tileObject.UpLeftQKey);

      }

      if ("BottomRight" in tileObject && "Zoom" in tileObject) {

          this.BottomRightTile = new xV.Tiles.Tile();
          this.BottomRightTile.initByGeo(tileObject.BottomRight.lat, tileObject.BottomRight.long, this.zoom);

      }

      if ("BottomRightQKey" in tileObject) {

          this.BottomRightTile = new xV.Tiles.Tile();
          this.BottomRightTile.setQKey( tileObject.BottomRightQKey)

      }

  }

}

xV.Tiles.Manager.prototype = {

  setZoom : function(){

  }


}


// --------------


var tileObject = {

          DB : "database.db",
          UpLeft : {
              lat : 0,
              long : 0
          },
          UpLeftAddress :  undefined,
          BottomRight : {
              lat : 3,
              long : 4
          },
          BottomRightAddress : undefined,
          Zoom : 1,
          Coef : 1

      }

var tm = xV.Tiles.Manager(tileObject);


var t = new xV.Tiles.Tile();
//n.setQKeyByTile(3, 5, 3);

t.setTileByQKey("00");
t.moveRight(2);



console.log("tiles:");
console.log(t.x);
console.log(t.y);
console.log(t.z);



