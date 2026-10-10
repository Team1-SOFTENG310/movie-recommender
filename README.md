# movie-recommender

[![Quality gate status](https://sonarcloud.io/api/project_badges/measure?project=fn5-310_movie-recommender&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=fn5-310_movie-recommender)

This project is for a website to recommend movies to users based on an initial starting movie, or a list of movies they enjoyed. This utilises clustering among nodes, visually indicating how similar a movie may be to each another.

## Getting Started
### Prerequisites
Node.js is required to run the project. This can be downloaded at [https://nodejs.org/en/download](https://nodejs.org/en/download), and going through the install instructions for your respective OS and package manager.

You can confirm that the install is successful by running the below commands in the terminal of your OS:
```
node --version
npm --version
npx --version
```
If all of the above commands each provide a version number (whether they are the same or not), you have successfully installed Node.js.

After this, the repo can be cloned. 

The project installs the node dependencies from the root by running the below command:
```shell
npm run install:all
```

### Setting up `.env`

Because the website uses TMDB, you need a TMDB API key.
Copy `.env.example` to `.env` in the project root and fill in your key:
```
TMDB_API_KEY=
VITE_TMDB_API_KEY=yourKeyHere
VITE_FRONTEND_PORT=5173
BACKEND_PORT=5000
```
`TMDB_API_KEY` is used by the server and falls back to `VITE_TMDB_API_KEY` when empty.
Never put secrets in `VITE_*` variables: Vite includes them in the browser bundle.

### Running the Website
The dev servers for both the ExpressJS server and React client can be run concurrently through one command from the project root:
```
npm run dev
```
The frontend server will be open on `localhost:5173` by default, while the backend server will be at `localhost:5000`.

## License
`movie-recommender` is licensed under the [MIT License](LICENSE).

## Learn More
If you want to contribute or learn more about the project, please consider viewing the [Contributor Guidelines](CONTRIBUTING.md).

You may also wish to view our [Code of Conduct](CODE_OF_CONDUCT.md).

## Contact
To reach out to a team member of fn5, feel free to reach out in person (group 5), or to email at `placeholderemail@placeholder.com`