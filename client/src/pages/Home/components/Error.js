import React from 'react'

const Error = () => {
  return (
    <>
      <p>No birds found. 😔</p>
      <button onClick={() => window.location.reload(true)}>Look Again</button>
    </>
  )
}

export default Error
