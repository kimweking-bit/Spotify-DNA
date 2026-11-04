export type Album = {
  id: string;
  title: string;
  artist: string;
  coverSrc: string;
  spotifyUrl: string;
};

export const albums: Album[] = [
  {
    id: "views",
    title: "Views",
    artist: "Drake",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02726abca207567d5e41cb9667",
    spotifyUrl: "https://open.spotify.com/album/3hARKC8cinq3mZLLAEaBh9",
  },
  {
    id: "astroworld",
    title: "ASTROWORLD",
    artist: "Travis Scott",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02daec894c14c0ca42d76eeb32",
    spotifyUrl: "https://open.spotify.com/album/41GuZcammIkupMPKH2OJ6I",
  },
  {
    id: "sos",
    title: "SOS",
    artist: "SZA",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c5276ed6cb0287df8d9be07f",
    spotifyUrl: "https://open.spotify.com/album/1nrVofqDRs7cpWXJ49qTnP",
  },
  {
    id: "iceman",
    title: "ICEMAN",
    artist: "Drake",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e020c00b5d46b1450f427207e44",
    spotifyUrl: "https://open.spotify.com/album/55HAHT4BN3wHSqr4NFMRfm",
  },
  {
    id: "the-last-wun",
    title: "The Last Wun",
    artist: "Gunna",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0203a253cffd6d9e556ef4eec5",
    spotifyUrl: "https://open.spotify.com/album/6l2aad6LJghHkbd0KX1f7w",
  },
  {
    id: "damn",
    title: "DAMN.",
    artist: "Kendrick Lamar",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028b52c6b9bc4e43d873869699",
    spotifyUrl: "https://open.spotify.com/album/4eLPsYPBmXABThSJ821sqY",
  },
  {
    id: "after-hours",
    title: "After Hours",
    artist: "The Weeknd",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028863bc11d2aa12b54f5aeb36",
    spotifyUrl: "https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj",
  },
  {
    id: "nothing-was-the-same",
    title: "Nothing Was The Same",
    artist: "Drake",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02bf8a12d14f589b35d7d073db",
    spotifyUrl: "https://open.spotify.com/album/5HCJzEGFCedz0DxsXhk1qG",
  },
  {
    id: "take-care",
    title: "Take Care (Deluxe)",
    artist: "Drake",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c7ea04a9b455e3f68ef82550",
    spotifyUrl: "https://open.spotify.com/album/6X1x82kppWZmDzlXXK3y3q",
  },
  {
    id: "2014-forest-hills-drive",
    title: "2014 Forest Hills Drive",
    artist: "J. Cole",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c6e0948bbb0681ff29cdbae8",
    spotifyUrl: "https://open.spotify.com/album/0UMMIkurRUmkruZ3KGBLtG",
  },
  {
    id: "blonde",
    title: "Blonde",
    artist: "Frank Ocean",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c5649add07ed3720be9d5526",
    spotifyUrl: "https://open.spotify.com/album/3mH6qwIy9crq0I9YQbOuDf",
  },
  {
    id: "scorpion",
    title: "Scorpion",
    artist: "Drake",
    coverSrc:
      "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f907de96b9a4fbc04accc0d5",
    spotifyUrl: "https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX",
  },
];

export const albumsWithCovers = albums;
export const hasAlbumCovers = albumsWithCovers.length > 0;
