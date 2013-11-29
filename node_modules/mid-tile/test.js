var midTile = require('./');

var Canvas = require('canvas'),
    canvas = new Canvas(256, 256),
    ctx = canvas.getContext('2d');

midTile('myfile.mbtiles', {
    name: 'My File',
    bounds: [-179, -80, 179, 80]
}, function(xyz, mbtiles, cb) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#000';
    ctx.fillText(xyz.join('/'), 50, 50);
    mbtiles.putTile(
        xyz[0], xyz[1], xyz[2],
        canvas.toBuffer(), function(err) {
        cb();
    });
});
