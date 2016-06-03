# crowdmap

A map editor for [pokecrystal].

Clone inside your pokecrystal repo. 
Then:
```bash
python gfx.py png gfx/tilesets/*.2bpp.lz gfx/tilesets/roofs/*.2bpp gfx/overworld/*.2bpp
touch gfx/tilesets/*.2bpp gfx/tilesets/roofs/*.2bpp gfx/overworld/*.2bpp
touch gfx/tilesets/*.2bpp.lz
```

Then run `python crowdmap/server.py 8000` and go to [http://127.0.0.1:8000/crowdmap](http://127.0.0.1:8000/crowdmap).

[pokecrystal]: https://github.com/pret/pokecrystal
