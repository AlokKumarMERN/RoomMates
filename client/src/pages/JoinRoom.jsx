import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import useRoom from '../hooks/useRoom.js';
import * as roomApi from '../services/room.service.js';
import { fieldErrorsFrom } from '../utils/formErrors.js';

export default function JoinRoom() {
  const { loadRooms, selectRoom } = useRoom();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const { room } = await roomApi.joinRoom({ code });
      await loadRooms();
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
      <h1 className="text-2xl font-semibold text-slate-900">Join a room</h1>
      <p className="mt-1.5 text-slate-600">
        Enter the code a flatmate shared with you.
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
          label="Room code"
          name="code"
          placeholder="RM-7X92AB"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setFieldErrors({});
          }}
          error={fieldErrors.code}
          hint="Upper or lower case, with or without the dash — all fine."
          className="[&_input]:tabular [&_input]:text-lg [&_input]:tracking-wider"
          autoComplete="off"
          autoCapitalize="characters"
          autoFocus
          required
        />

        <Button type="submit" className="mt-6 w-full" isLoading={isSubmitting}>
          {isSubmitting ? 'Joining…' : 'Join room'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Don&apos;t have a code?{' '}
        <Link to="/rooms/new" className="font-medium text-brand-600 hover:text-brand-700">
          Create your own room
        </Link>
      </p>
    </div>
  );
}
