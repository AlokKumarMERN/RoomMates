import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import useRoom from '../hooks/useRoom.js';
import * as roomApi from '../services/room.service.js';
import { fieldErrorsFrom } from '../utils/formErrors.js';

const SUGGESTIONS = ['Home', 'Flat 2B', 'Office', 'Goa Trip'];

export default function CreateRoom() {
  const { loadRooms, selectRoom } = useRoom();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const { room } = await roomApi.createRoom({ name });
      await loadRooms();
      // Land the user in the room they just made — the code is there to share.
      selectRoom(room.id);
      navigate(`/rooms/${room.id}`, { replace: true });
    } catch (error) {
      setFieldErrors(fieldErrorsFrom(error));
      setFormError(error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-slate-900">Create a room</h1>
      <p className="mt-1.5 text-slate-600">
        You&apos;ll get a code to share. Anyone with it can join and start adding expenses.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 rounded-xl border border-slate-200 bg-white p-6"
      >
        {formError && (
          <p role="alert" className="mb-5 rounded-lg bg-negative-50 px-3.5 py-2.5 text-sm text-negative-700">
            {formError}
          </p>
        )}

        <Input
          label="Room name"
          name="name"
          placeholder="Home"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setFieldErrors({});
          }}
          error={fieldErrors.name}
          hint="Something you'll recognise in a list — the flat, the trip, the office."
          autoFocus
          required
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setName(suggestion)}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <Button type="submit" className="mt-6 w-full" isLoading={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create room'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Got a code instead?{' '}
        <Link to="/rooms/join" className="font-medium text-brand-600 hover:text-brand-700">
          Join a room
        </Link>
      </p>
    </div>
  );
}
