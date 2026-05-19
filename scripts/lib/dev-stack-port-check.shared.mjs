import net from "node:net"

/**
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const finish = (inUse) => {
      socket.destroy()
      resolve(inUse)
    }
    socket.setTimeout(750)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))
    socket.connect(port, "127.0.0.1")
  })
}

/**
 * @param {number[]} ports
 * @returns {Promise<number[]>} ports that are already listening
 */
export async function listPortsInUse(ports) {
  const results = await Promise.all(
    ports.map(async (port) => ((await isPortInUse(port)) ? port : null))
  )
  return results.filter((p) => p !== null)
}
