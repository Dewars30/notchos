// Platform-conditional IPC transport: Unix domain sockets on Unix, named pipes on Windows.

use tokio::io::{AsyncBufReadExt, BufReader, Lines};

// ─── Unix implementation ────────────────────────────────────────────────────

#[cfg(unix)]
pub const IPC_ADDRESS: &str = "/tmp/notchos.sock";

#[cfg(unix)]
pub struct Listener {
    inner: tokio::net::UnixListener,
}

#[cfg(unix)]
impl Listener {
    pub fn bind() -> std::io::Result<Self> {
        // Remove stale socket before binding
        let _ = std::fs::remove_file(IPC_ADDRESS);
        let inner = tokio::net::UnixListener::bind(IPC_ADDRESS)?;
        Ok(Self { inner })
    }

    pub async fn accept(&self) -> std::io::Result<Connection> {
        let (stream, _) = self.inner.accept().await?;
        let (reader, writer) = stream.into_split();
        Ok(Connection {
            lines: BufReader::new(reader).lines(),
            writer,
        })
    }
}

#[cfg(unix)]
pub struct Connection {
    pub lines: Lines<BufReader<tokio::net::unix::OwnedReadHalf>>,
    pub writer: tokio::net::unix::OwnedWriteHalf,
}

// ─── Windows implementation ─────────────────────────────────────────────────

#[cfg(windows)]
pub const IPC_ADDRESS: &str = r"\\.\pipe\notchos";

#[cfg(windows)]
pub struct Listener {
    // On Windows, named pipe servers create a new instance for each connection.
    // tokio::net::windows::named_pipe works differently from Unix sockets:
    // you create a ServerOptions, call create(), then await connect() for each client.
}

#[cfg(windows)]
impl Listener {
    pub fn bind() -> std::io::Result<Self> {
        Ok(Self {})
    }

    pub async fn accept(&self) -> std::io::Result<Connection> {
        use tokio::net::windows::named_pipe::ServerOptions;

        let server = ServerOptions::new()
            .first_pipe_instance(false)
            .create(IPC_ADDRESS)?;

        server.connect().await?;

        let (reader, writer) = tokio::io::split(server);
        Ok(Connection {
            lines: BufReader::new(reader).lines(),
            writer,
        })
    }
}

#[cfg(windows)]
pub struct Connection {
    pub lines: Lines<BufReader<tokio::io::ReadHalf<tokio::net::windows::named_pipe::NamedPipeServer>>>,
    pub writer: tokio::io::WriteHalf<tokio::net::windows::named_pipe::NamedPipeServer>,
}
