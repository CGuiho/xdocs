package apperror

import (
	"errors"
	"fmt"
)

const (
	Unexpected    = 1
	Usage         = 2
	Configuration = 3
	Remote        = 4
	Mutation      = 5
)

type Error struct {
	Code int
	Op   string
	Err  error
}

func (e *Error) Error() string {
	if e.Op == "" {
		return e.Err.Error()
	}
	return fmt.Sprintf("%s: %v", e.Op, e.Err)
}

func (e *Error) Unwrap() error {
	return e.Err
}

func New(code int, message string) error {
	return &Error{Code: code, Err: errors.New(message)}
}

func Wrap(code int, op string, err error) error {
	if err == nil {
		return nil
	}
	return &Error{Code: code, Op: op, Err: err}
}

func Code(err error) int {
	var appErr *Error
	if errors.As(err, &appErr) {
		return appErr.Code
	}
	return Unexpected
}
